"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import InviteModal from "@/components/InviteModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import JoinModal from "@/components/JoinModal";
import ChatInput from "@/components/ChatInput";
import { Plus, Users, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const DotLoader = () => (
  <div className="flex items-center space-x-1 animate-pulse">
    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
  </div>
);

const generateCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatTitles, setChatTitles] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const createChatIfNotExists = async (): Promise<string | null> => {
    if (!currentChatId && currentUserId) {
      const { data, error } = await supabase
        .from("chats")
        .insert([{ user_id: currentUserId, title: "New Chat" }])
        .select()
        .single();

      if (error) {
        console.error("Chat creation failed", error);
        return null;
      } else {
        setCurrentChatId(data.id);
        fetchChatTitles();
        return data.id;
      }
    }
    return currentChatId;
  };

  const fetchChatTitles = async () => {
  if (!currentUserId) return;

  // 1. Fetch personal chats
  const { data: ownChatsData } = await supabase
    .from("chats")
    .select("id, title, created_at")
    .eq("user_id", currentUserId);

  const ownChats = ownChatsData ?? [];

  // 2. Fetch shared chats from joined rooms
  const { data: joinedRooms } = await supabase
    .from("room_users")
    .select("rooms(chat_id)")
    .eq("user_id", currentUserId);

  const sharedChatIds = joinedRooms?.map((r: any) => r.rooms.chat_id) || [];

  let sharedChats: { id: string; title: string; created_at: string }[] = [];

  if (sharedChatIds.length > 0) {
    const { data: chats } = await supabase
      .from("chats")
      .select("id, title, created_at")
      .in("id", sharedChatIds);

    sharedChats = chats || [];
  }

  // 3. Combine and set
  const allChats = [...ownChats, ...sharedChats].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  setChatTitles(allChats);
};


  const sendMessage = async (inputMsg: string) => {
    if (!inputMsg.trim()) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: inputMsg };

    setMessages((prev) => [...prev, userMsg]);

    const chatId = await createChatIfNotExists();
    if (!chatId || !currentUserId) return;

    const { error: insertError } = await supabase.from("messages").insert([
      { chat_id: chatId, role: "user", content: inputMsg },
    ]);

    if (insertError) {
      console.error("Error inserting message:", insertError);
      return;
    }

    setTimeout(() => {
      setMessages((prev) => [...prev, { id: "streaming", role: "assistant", content: "" }]);
    }, 0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...messages, userMsg],
        chat_id: chatId,
        user_id: currentUserId,
      }),
      signal: controller.signal,
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let assistantReply = "";

    while (true) {
      const { value, done } = await reader!.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      assistantReply += chunk;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === "streaming" ? { ...m, content: assistantReply } : m
        )
      );
    }

    setMessages((prev) => {
      const filtered = prev.filter((m) => m.id !== "streaming");
      return [...filtered, { id: crypto.randomUUID(), role: "assistant", content: assistantReply }];
    });

    setLoading(false);
    abortControllerRef.current = null;
  };

  const cancelStreaming = () => {
    abortControllerRef.current?.abort();
    setLoading(false);
    setMessages((prev) => prev.filter((m) => m.id !== "streaming"));
  };

  const loadChat = async (chatId: string) => {
    setChatLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("role, content")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    setMessages(
      data?.map((msg: any) => ({
        id: crypto.randomUUID(),
        role: msg.role,
        content: msg.content,
      })) || []
    );
    setCurrentChatId(chatId);
    setIsSidebarOpen(false);
    setChatLoading(false);
  };

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
      } else {
        setAuthenticated(true);
        setCurrentUserId(data.session.user.id);
      }
    };
    getSession();
  }, []);

  useEffect(() => {
    if (currentUserId) fetchChatTitles();
  }, [currentUserId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJoin = async (code: string) => {
    if (!currentUserId) return;
    setActionLoading(true);
    try {
      // All variables declared inside try block to avoid redeclaration
      const joinRoomRes = await supabase
        .from("rooms")
        .select("id, chat_id")
        .eq("code", code)
        .single();
      const room = joinRoomRes.data;
      const fetchError = joinRoomRes.error;

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error checking room:", fetchError);
        return;
      }

      if (!room) {
        console.error("Invalid invite code");
        return;
      }

      const existingRes = await supabase
        .from("room_users")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("room_id", room.id)
        .maybeSingle();
      const existing = existingRes.data;

      if (existing) {
        console.log("Already joined room");
        await loadChat(room.chat_id);
        setJoinSuccess(true);
        return;
      }

      const insertRes = await supabase.from("room_users").insert([
        {
          user_id: currentUserId,
          room_id: room.id,
          joined_at: new Date(),
        },
      ]);
      const insertError = insertRes.error;

      if (insertError) {
        console.error("Joining room failed", insertError);
        return;
      }

      await loadChat(room.chat_id);
      setJoinSuccess(true);
    } finally {
      setActionLoading(false);
    }
  };


  const handleInvite = async () => {
    if (!currentUserId || !currentChatId) return;
    setActionLoading(true);
    try {
      // All variables declared inside try block to avoid redeclaration
      const existingRoomRes = await supabase
        .from("rooms")
        .select("code")
        .eq("created_by", currentUserId)
        .eq("chat_id", currentChatId)
        .single();
      const existingRoom = existingRoomRes.data;
      const fetchError = existingRoomRes.error;

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error checking existing room:", fetchError);
        return;
      }

      if (existingRoom?.code) {
        setInviteCode(existingRoom.code);
      } else {
        const code = generateCode();
        const insertRes = await supabase.from("rooms").insert([
          { created_by: currentUserId, chat_id: currentChatId, code: code },
        ]);
        const insertError = insertRes.error;
        if (!insertError) {
          setInviteCode(code);
        } else {
          console.error("Room creation failed", insertError);
        }
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-xl">Redirecting to login...</p>
      </main>
    );
  }


  return (
    <>
     {inviteCode && (
  <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/30">
    <InviteModal code={inviteCode} onClose={() => setInviteCode(null)} />
  </div>
)}
    {showJoinModal && (
      <JoinModal onJoin={handleJoin} onClose={() => setShowJoinModal(false)} />
    )}
    {joinSuccess && (
      <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/30">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white w-80 text-center border border-gray-600">
          <h2 className="text-xl font-semibold mb-4">Joined Room successfully</h2>
          <button
            onClick={() => setJoinSuccess(false)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-transform active:scale-95 mt-4 w-full"
          >
            Close
          </button>
        </div>
      </div>
    )}
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <aside className={`bg-gray-800 border-r border-white/10 shadow-xl p-4 w-64 fixed z-40 h-full top-0 left-0 transition-transform duration-200 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="pt-16 flex flex-col h-full">
          <h2 className="text-lg font-semibold mb-4 px-2">History</h2>

          {/* Buttons Section */}
          <div className="space-y-2 mb-4">
            {/* New Chat Button */}
            <motion.button
              onClick={async () => {
                const { data, error } = await supabase.from("chats").insert([
                  { user_id: currentUserId, title: "New Chat" },
                ]).select().single();
                if (!error && data) {
                  setCurrentChatId(data.id);
                  setMessages([]);
                  fetchChatTitles();
                }
              }}
              className="group w-full flex items-center gap-2 bg-blue-600/80 text-white px-3 py-2 rounded-lg text-sm shadow relative overflow-hidden transition-all duration-200"
              whileHover={{ scale: 1.05, boxShadow: "0 0 24px 0 rgba(251,113,133,0.18)" }}
            >
              <span
                className="absolute inset-0 pointer-events-none rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(251,113,133,0.18) 0%, rgba(253,186,116,0.18) 100%)",
                  zIndex: 1,
                }}
              />
              <span className="relative z-10 flex items-center gap-2"><Plus size={18} /> New Chat</span>
            </motion.button>

            {/* Join & Invite Buttons in 2:1 Ratio */}
            <div className="flex gap-2">
              <motion.button
                className="group flex-2 flex items-center justify-center gap-1 bg-green-600/80 text-white px-3 py-2 rounded-lg text-sm w-2/3 shadow relative overflow-hidden transition-all duration-200"
                onClick={() => setShowJoinModal(true)}
                whileHover={{ scale: 1.05, boxShadow: "0 0 24px 0 rgba(251,113,133,0.18)" }}
              >
                <span
                  className="absolute inset-0 pointer-events-none rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(251,113,133,0.18) 0%, rgba(253,186,116,0.18) 100%)",
                    zIndex: 1,
                  }}
                />
                <span className="relative z-10 flex items-center gap-1"><Users size={16} /> Join</span>
              </motion.button>
              <motion.button
                className="group flex-1 flex items-center justify-center gap-1 bg-purple-600/80 text-white px-3 py-2 rounded-lg text-sm w-1/3 shadow relative overflow-hidden transition-all duration-200"
                onClick={handleInvite}
                whileHover={{ scale: 1.05, boxShadow: "0 0 24px 0 rgba(251,113,133,0.18)" }}
              >
                <span
                  className="absolute inset-0 pointer-events-none rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(251,113,133,0.18) 0%, rgba(253,186,116,0.18) 100%)",
                    zIndex: 1,
                  }}
                />
                <span className="relative z-10 flex items-center gap-1"><UserPlus size={16} /> Invite</span>
              </motion.button>
            </div>
          </div>

          {/* Chat Titles */}
          <div className="space-y-2 overflow-y-auto max-h-[60vh] flex-1 pb-4">
            <AnimatePresence initial={false}>
              {chatTitles.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => loadChat(chat.id)}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-medium relative overflow-hidden transition-all duration-200
                    ${chat.id === currentChatId
                      ? "text-blue-200"
                      : "bg-gray-700/80 hover:bg-gray-600/80 text-white/90"}
                  `}
                  style={{ zIndex: 1 }}
                >
                  {/* Animated background for active chat */}
                  {chat.id === currentChatId && (
                    <motion.div
                      key={chat.id}
                      className="absolute inset-0 rounded-lg bg-blue-500/10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                  <span className="relative z-10">{chat.title || "Untitled"}</span>
                </button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-0 md:ml-64">
        {/* Floating Header */}
        
        <div className="fixed top-0 left-0 right-0 z-50 flex w-full flex-nowrap border-b border-gray-700 p-4 items-center justify-between bg-gray-800 transition-all duration-200"
          style={{ marginLeft: isSidebarOpen ? 0 : undefined }}
        >
          <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
            <button className="md:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold truncate">coLLM</h1>
          </div>
          <div
            className="text-sm text-gray-400 hover:text-white transition transform active:scale-95 cursor-pointer flex-shrink-0 whitespace-nowrap ml-4"
            onClick={async () => {
              await supabase.auth.signOut();
              router.refresh();
            }}
          >
            Logout
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 w-full max-w-4xl self-center overflow-y-auto p-6 space-y-2 mt-20 mb-32">
          {(chatLoading || actionLoading) && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          {messages.map((msg, idx) => {
            const nextMsg = messages[idx + 1];
            const isRoleChange = nextMsg && nextMsg.role !== msg.role;
            const marginClass = isRoleChange ? 'mb-4' : 'mb-2';
            return (
              <div
                key={msg.id}
                className={`whitespace-pre-wrap ${msg.role === "user" ? "text-right" : "text-left"} ${marginClass}`}
              >
                <div
                  className={`inline-block px-4 py-2 rounded-xl prose prose-invert prose-p:my-0 prose-li:my-0 prose-ul:my-0 prose-ol:my-0 prose-ul:space-y-0 prose-ol:space-y-0 prose-li:flex prose-li:items-center prose-li:gap-2 list-inside leading-tight break-words max-w-2xl ${
                    msg.role === "user" ? "bg-blue-600 ml-auto" : "bg-gray-700"
                  }`}
                  style={{ lineHeight: "1.5", margin: 0 }}
                >
                  {msg.id === "streaming" && msg.content === "" ? (
                    <DotLoader />
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        p: ({ children }) => <p className="my-0 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-5 my-0 space-y-0">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 my-0 space-y-0">{children}</ol>,
                        li: ({ children }) => <li className="leading-snug">{children}</li>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef}></div>
        </div>

        {/* Floating Input Box (Centered and Fixed) */}
        <div className="fixed bottom-4 w-full flex justify-center z-50 px-4 md:pl-64">
          <div className="w-full max-w-3xl px-4">
            {!(isSidebarOpen && windowWidth < 768) && (
              <ChatInput
                loading={loading}
                onSend={(msg) => {
                  setLoading(true);
                  sendMessage(msg);
                }}
                onCancel={cancelStreaming}
              />
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
