import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';
export const runtime = "edge";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  try {
    const { messages, chat_id, user_id } = await req.json();

    const geminiMessages = messages.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const result = await model.generateContentStream({ contents: geminiMessages });

    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              fullResponse += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          // Save assistant message to Supabase after streaming
          if (chat_id && user_id && fullResponse.trim()) {
            await supabase.from("messages").insert([
              {
                chat_id,
                role: "assistant",
                content: fullResponse.trim(),
              },
            ]);
          }

          controller.close();
        } catch (streamErr) {
          console.error("Stream reading error:", streamErr);
          controller.error(streamErr);
        }
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
