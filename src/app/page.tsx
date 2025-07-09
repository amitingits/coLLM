"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

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

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatTitles, setChatTitles] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const createChatIfNotExists = async () => {
    if (!currentChatId && currentUserId) {
      const { data, error } = await supabase.from("chats").insert([
        { user_id: currentUserId, title: "New Chat" },
      ]).select().single();

      if (error) {
        console.error("Chat creation failed", error);
      } else {
        setCurrentChatId(data.id);
        fetchChatTitles();
      }
    }
  };

  const fetchChatTitles = async () => {
    if (currentUserId) {
      const { data } = await supabase
        .from("chats")
        .select("id, title")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });
      if (data) setChatTitles(data);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: input };
    await createChatIfNotExists();

    if (currentChatId && currentUserId) {
      await supabase.from("messages").insert([
        { chat_id: currentChatId, role: "user", content: input },
      ]);
    }

    setMessages((prev) => [...prev, userMsg]);

    // Add assistant streaming bubble separately
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: "streaming", role: "assistant", content: "" }]);
    }, 0);
    setInput("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...messages, userMsg],
        chat_id: currentChatId,
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

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-xl">Redirecting to login...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <aside className={`bg-gray-800 p-4 w-64 border-r border-gray-700 fixed z-40 h-full top-0 left-0 transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="pt-16"> {/* Add this wrapper with padding top */}
          <h2 className="text-lg font-semibold mb-4">History</h2>

          {/* Buttons Section */}
          <div className="space-y-2 mb-4">
            {/* New Chat Button */}
            <button
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
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition transform text-white px-3 py-2 rounded text-sm"
            >
              + New Chat
            </button>

            {/* Join & Invite Buttons in 2:1 Ratio */}
            <div className="flex gap-2">
              <button className="flex-2 bg-green-600 hover:bg-green-700 active:scale-95 transition transform text-white px-3 py-2 rounded text-sm w-2/3">
                Join
              </button>
              <button className="flex-1 bg-purple-600 hover:bg-purple-700 active:scale-95 transition transform text-white px-3 py-2 rounded text-sm w-1/3">
                Invite
              </button>
            </div>
          </div>

          {/* Chat Titles */}
          <div className="space-y-2 overflow-y-auto max-h-[70vh]">
            {chatTitles.map((chat) => (
              <button
                key={chat.id}
                onClick={() => loadChat(chat.id)}
                className="block w-full text-left px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm transition-colors"
              >
                {chat.title || "Untitled"}
              </button>
            ))}
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
        <div className="flex-1 w-full max-w-3xl self-center overflow-y-auto p-6 space-y-4 mt-20 mb-32">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`whitespace-pre-wrap ${msg.role === "user" ? "text-right" : "text-left"}`}
            >
              <div
                className={`inline-block px-5 py-3 rounded-lg prose prose-invert break-words max-w-[85%] ${
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
                      ul: ({ children }) => <ul className="list-disc pl-5 my-1 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 my-1 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-snug">{children}</li>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>

        {/* Floating Input Box (Centered and Fixed) */}
        <div className="fixed bottom-4 w-full flex justify-center z-50 px-4 md:pl-64">
          <div className="w-full max-w-3xl px-4">
            <form
              onSubmit={(e) => {
                setLoading(true);
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2 bg-gray-800 p-3 rounded-lg border border-gray-700"
            >
              <input
                type="text"
                className="flex-1 p-3 bg-gray-700 text-white rounded-md outline-none"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              {loading ? (
                <button
                  type="button"
                  onClick={cancelStreaming}
                  className="bg-red-600 hover:bg-red-700 active:scale-95 transition transform px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition transform px-4 py-2 rounded-md disabled:opacity-50"
                  disabled={loading}
                >
                  Send
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
