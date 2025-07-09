import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';

export const runtime = "edge";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Make sure this is added in .env
);

export async function POST(req: Request) {
  try {
    const { messages, chat_id, user_id } = await req.json();

    const geminiMessages = messages.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    let fullResponse = "";

    const result = await model.generateContentStream({ contents: geminiMessages });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            fullResponse += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        if (chat_id && user_id && fullResponse.trim()) {
          const { data: chatData, error: fetchError } = await supabase
            .from("chats")
            .select("id, title")
            .eq("id", chat_id)
            .single();

          if (!fetchError && chatData && chatData.title === "New Chat") {
            const titlePrompt = `Give a 3-5 word title for this conversation: \"${messages[0].content}\"`;
            const titleResult = await model.generateContent({
              contents: [{ role: "user", parts: [{ text: titlePrompt }] }],
            });

            const suggestedTitle = titleResult.response.text().replaceAll("\n", "").trim();

            await supabase.from("chats").update({ title: suggestedTitle }).eq("id", chat_id);
          }

          await supabase.from("messages").insert([
            {
              chat_id,
              role: "assistant",
              content: fullResponse.trim(),
            },
          ]);
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Gemini streaming error:", error);
    return new Response(JSON.stringify({ error: "Gemini API failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
