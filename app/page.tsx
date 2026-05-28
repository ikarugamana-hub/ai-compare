"use client";

import { useState } from "react";

type AiResponses = {
  chatgpt: string;
  grok: string;
  claude: string;
};

type Result = {
  responses: AiResponses;
  summary: string;
};

const AI_CARDS = [
  {
    key: "chatgpt" as const,
    label: "ChatGPT",
    color: "from-emerald-500 to-teal-600",
    icon: "🤖",
  },
  {
    key: "grok" as const,
    label: "Grok",
    color: "from-gray-600 to-gray-800",
    icon: "⚡",
  },
  {
    key: "claude" as const,
    label: "Claude",
    color: "from-orange-500 to-amber-600",
    icon: "🔮",
  },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI 比較ツール
          </h1>
          <p className="text-slate-400 text-sm">
            ChatGPT・Grok・Claude に同時に質問 → ChatGPT が総合回答を生成
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
            <textarea
              className="w-full bg-transparent px-5 pt-5 pb-3 text-white placeholder-slate-500 resize-none focus:outline-none text-base"
              rows={4}
              placeholder="質問を入力してください..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e);
              }}
            />
            <div className="flex justify-between items-center px-5 py-3 border-t border-slate-700">
              <span className="text-slate-500 text-xs">⌘+Enter で送信</span>
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-medium text-sm transition-all"
              >
                {loading ? "回答取得中..." : "送信"}
              </button>
            </div>
          </div>
        </form>

        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {AI_CARDS.map((ai) => (
                <div key={ai.key} className="bg-slate-800 rounded-2xl border border-slate-700 p-5 animate-pulse">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{ai.icon}</span>
                    <span className="text-slate-400 font-medium">{ai.label}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-700 rounded" />
                    <div className="h-3 bg-slate-700 rounded w-4/5" />
                    <div className="h-3 bg-slate-700 rounded w-3/5" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-slate-400 text-sm animate-pulse">
              3つのAIに同時にリクエスト送信中...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-5 py-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {AI_CARDS.map((ai) => (
                <div key={ai.key} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
                  <div className={`bg-gradient-to-r ${ai.color} px-5 py-3 flex items-center gap-2`}>
                    <span className="text-lg">{ai.icon}</span>
                    <span className="font-semibold text-white">{ai.label}</span>
                  </div>
                  <div className="px-5 py-4 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                    {result.responses[ai.key]}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-800 rounded-2xl border border-purple-700/50 overflow-hidden shadow-xl">
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 px-6 py-4 flex items-center gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <p className="font-bold text-white text-lg">ChatGPT による総合まとめ</p>
                  <p className="text-blue-200 text-xs">3つの回答を統合・整理した総合回答</p>
                </div>
              </div>
              <div className="px-6 py-5 text-slate-200 text-base leading-relaxed whitespace-pre-wrap">
                {result.summary}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
