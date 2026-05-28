import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// Allow up to 60s on Vercel Pro / 10s on free
export const maxDuration = 60;

type Model = "chatgpt" | "grok" | "claude" | "summary";

interface RequestBody {
  prompt: string;
  model: Model;
  responses?: { chatgpt: string; grok: string; claude: string };
}

export async function POST(req: NextRequest) {
  const { prompt, model, responses } = (await req.json()) as RequestBody;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    if (model === "chatgpt") {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
      });
      return NextResponse.json({ response: res.choices[0].message.content ?? "" });
    }

    if (model === "grok") {
      const grok = new OpenAI({
        apiKey: process.env.GROK_API_KEY,
        baseURL: "https://api.x.ai/v1",
      });
      const res = await grok.chat.completions.create({
        model: "grok-3",
        messages: [{ role: "user", content: prompt }],
      });
      return NextResponse.json({ response: res.choices[0].message.content ?? "" });
    }

    if (model === "claude") {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const res = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      const block = res.content[0];
      return NextResponse.json({ response: block.type === "text" ? block.text : "" });
    }

    if (model === "summary") {
      if (!responses) {
        return NextResponse.json({ error: "responses required for summary" }, { status: 400 });
      }
      const summaryPrompt = `以下は同じ質問「${prompt}」に対する3つのAIの回答です。

【ChatGPTの回答】
${responses.chatgpt}

【Grokの回答】
${responses.grok}

【Claudeの回答】
${responses.claude}

上記3つの回答を統合・整理し、最も重要な情報を網羅した総合的な回答を日本語でまとめてください。各AIの視点の違いや共通点も踏まえてください。`;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: summaryPrompt }],
      });
      return NextResponse.json({ response: res.choices[0].message.content ?? "" });
    }

    return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
