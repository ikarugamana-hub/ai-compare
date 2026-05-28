import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getGrok() {
  return new OpenAI({
    apiKey: process.env.GROK_API_KEY,
    baseURL: "https://api.x.ai/v1",
  });
}

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function callChatGPT(prompt: string): Promise<string> {
  const res = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
  });
  return res.choices[0].message.content ?? "";
}

async function callGrok(prompt: string): Promise<string> {
  const res = await getGrok().chat.completions.create({
    model: "grok-3",
    messages: [{ role: "user", content: prompt }],
  });
  return res.choices[0].message.content ?? "";
}

async function callClaude(prompt: string): Promise<string> {
  const res = await getAnthropic().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  const block = res.content[0];
  return block.type === "text" ? block.text : "";
}

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const [chatgpt, grokRes, claude] = await Promise.allSettled([
    callChatGPT(prompt),
    callGrok(prompt),
    callClaude(prompt),
  ]);

  const responses = {
    chatgpt: chatgpt.status === "fulfilled" ? chatgpt.value : `エラー: ${(chatgpt as PromiseRejectedResult).reason?.message ?? "不明なエラー"}`,
    grok: grokRes.status === "fulfilled" ? grokRes.value : `エラー: ${(grokRes as PromiseRejectedResult).reason?.message ?? "不明なエラー"}`,
    claude: claude.status === "fulfilled" ? claude.value : `エラー: ${(claude as PromiseRejectedResult).reason?.message ?? "不明なエラー"}`,
  };

  const summaryPrompt = `以下は同じ質問「${prompt}」に対する3つのAIの回答です。

【ChatGPTの回答】
${responses.chatgpt}

【Grokの回答】
${responses.grok}

【Claudeの回答】
${responses.claude}

上記3つの回答を統合・整理し、最も重要な情報を網羅した総合的な回答を日本語でまとめてください。各AIの視点の違いや共通点も踏まえてください。`;

  let summary = "";
  try {
    summary = await callChatGPT(summaryPrompt);
  } catch (e: unknown) {
    summary = `まとめ生成エラー: ${e instanceof Error ? e.message : "不明なエラー"}`;
  }

  return NextResponse.json({ responses, summary });
}
