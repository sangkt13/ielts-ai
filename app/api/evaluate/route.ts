
// app/api/evaluate/route.ts
import OpenAI from "openai";
import { IELTS_SPEAKING_RUBRIC } from "@/lib/prompt";

export const runtime = "nodejs"; // đảm bảo chạy server-side

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { transcript, topic } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      return Response.json({ error: "Missing transcript" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const model = process.env.OPENAI_MODEL || "gpt-5";

    // Responses API (khuyến nghị cho dự án mới) :contentReference[oaicite:2]{index=2}
    const resp = await client.responses.create({
      model,
      reasoning: { effort: "low" },
      instructions: IELTS_SPEAKING_RUBRIC,
      input: [
        {
          role: "user",
          content:
            `Topic/Question: ${topic || "(not provided)"}\n\n` +
            `Candidate answer (transcript):\n${transcript}\n`,
        },
      ],
    });

    const outputText = resp.output_text || "";
    const parsed = safeJsonParse(outputText);

    if (!parsed) {
      // fallback: trả raw nếu model lỡ lệch format
      return Response.json(
        { error: "Model did not return valid JSON", raw: outputText },
        { status: 502 }
      );
    }

    return Response.json(parsed);
  } catch (e: any) {
    return Response.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
