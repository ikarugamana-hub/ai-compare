"use client";

import { useState, useRef, useEffect } from "react";
import MatrixRain from "./components/MatrixRain";

type AiKey = "chatgpt" | "grok" | "claude";
type AiStatus = "waiting" | "loading" | "done" | "error";
type Phase = "idle" | "querying" | "summarizing" | "done";

interface LogEntry {
  id: number;
  time: string;
  text: string;
  type: "info" | "success" | "error" | "warn";
}

const AI_CONFIG: {
  key: AiKey;
  label: string;
  modelName: string;
  icon: string;
  headerClass: string;
}[] = [
  {
    key: "chatgpt",
    label: "ChatGPT",
    modelName: "gpt-4o",
    icon: "🤖",
    headerClass: "bg-gradient-to-r from-emerald-500 to-teal-600",
  },
  {
    key: "grok",
    label: "Grok",
    modelName: "grok-3",
    icon: "⚡",
    headerClass: "bg-gradient-to-r from-gray-600 to-gray-800",
  },
  {
    key: "claude",
    label: "Claude",
    modelName: "claude-sonnet",
    icon: "🔮",
    headerClass: "bg-gradient-to-r from-orange-500 to-amber-600",
  },
];

// Static Tailwind class maps (must be full strings for Tailwind's scanner)
const CARD_STATUS: Record<AiStatus, string> = {
  waiting: "border-slate-600 bg-black/40",
  loading: "border-blue-500 bg-blue-950/50",
  done:    "border-emerald-500 bg-emerald-950/50",
  error:   "border-red-500 bg-red-950/50",
};

const LOG_COLOR: Record<LogEntry["type"], string> = {
  info:    "text-slate-300",
  success: "text-emerald-400",
  error:   "text-red-400",
  warn:    "text-yellow-400",
};

let logId = 0;

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [statuses, setStatuses] = useState<Record<AiKey | "summary", AiStatus>>({
    chatgpt: "waiting", grok: "waiting", claude: "waiting", summary: "waiting",
  });
  const [responses, setResponses] = useState<Record<AiKey, string>>({
    chatgpt: "", grok: "", claude: "",
  });
  const [summary, setSummary] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState("");

  const logsEndRef = useRef<HTMLDivElement>(null);
  // Use ref to pass responses to summary call (avoids stale closure)
  const responsesRef = useRef<Record<AiKey, string>>({ chatgpt: "", grok: "", claude: "" });

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  function addLog(text: string, type: LogEntry["type"] = "info") {
    const time = new Date().toLocaleTimeString("ja-JP", { hour12: false });
    setLogs(prev => [...prev, { id: logId++, time, text, type }]);
  }

  function setStatus(key: AiKey | "summary", status: AiStatus) {
    setStatuses(prev => ({ ...prev, [key]: status }));
  }

  async function callAI(aiKey: AiKey, promptText: string) {
    addLog(`${AI_CONFIG.find(a => a.key === aiKey)!.label} (${AI_CONFIG.find(a => a.key === aiKey)!.modelName}) へリクエスト送信...`);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText, model: aiKey }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      responsesRef.current[aiKey] = data.response;
      setResponses(prev => ({ ...prev, [aiKey]: data.response }));
      setStatus(aiKey, "done");
      addLog(`${AI_CONFIG.find(a => a.key === aiKey)!.label} 応答受信 ✓`, "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "不明なエラー";
      responsesRef.current[aiKey] = `エラー: ${msg}`;
      setResponses(prev => ({ ...prev, [aiKey]: `エラー: ${msg}` }));
      setStatus(aiKey, "error");
      addLog(`${aiKey} エラー: ${msg}`, "error");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    // Reset
    setPhase("querying");
    setError("");
    setSummary("");
    setLogs([]);
    responsesRef.current = { chatgpt: "", grok: "", claude: "" };
    setResponses({ chatgpt: "", grok: "", claude: "" });
    setStatuses({ chatgpt: "loading", grok: "loading", claude: "loading", summary: "waiting" });

    addLog("AI クエリエンジン起動...");
    addLog("ChatGPT / Grok / Claude へ並列接続中...");

    try {
      await Promise.all([
        callAI("chatgpt", prompt),
        callAI("grok", prompt),
        callAI("claude", prompt),
      ]);

      addLog("全 AI からの応答受信完了", "success");
      addLog("ChatGPT で総合まとめを生成中...", "warn");
      setPhase("summarizing");
      setStatus("summary", "loading");

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: "summary",
          responses: responsesRef.current,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSummary(data.response);
      setStatus("summary", "done");
      addLog("総合まとめ生成完了 ✓", "success");
      setPhase("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      setError(msg);
      addLog(`致命的エラー: ${msg}`, "error");
      setPhase("idle");
    }
  }

  const isLoading = phase === "querying" || phase === "summarizing";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* ── Header ── */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI 比較ツール
          </h1>
          <p className="text-slate-400 text-sm">
            ChatGPT · Grok · Claude に同時質問 → ChatGPT が総合回答を生成
          </p>
        </div>

        {/* ── Input form ── */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
            <textarea
              className="w-full bg-transparent px-5 pt-5 pb-3 text-white placeholder-slate-500 resize-none focus:outline-none text-base"
              rows={4}
              placeholder="質問を入力してください..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={isLoading}
              onKeyDown={e => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e);
              }}
            />
            <div className="flex justify-between items-center px-5 py-3 border-t border-slate-700">
              <span className="text-slate-500 text-xs">⌘+Enter で送信</span>
              <button
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-medium text-sm transition-all"
              >
                {isLoading ? "処理中..." : "送信"}
              </button>
            </div>
          </div>
        </form>

        {/* ── PROCESSING SCREEN (Matrix rain + terminal) ── */}
        {isLoading && (
          <div className="mb-8 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl" style={{ height: 460 }}>
            <div className="relative w-full h-full bg-black">

              {/* Matrix rain canvas */}
              <MatrixRain />

              {/* Overlay UI */}
              <div className="absolute inset-0 p-4 flex flex-col gap-3">

                {/* AI status cards */}
                <div className="grid grid-cols-3 gap-3">
                  {AI_CONFIG.map(ai => (
                    <div
                      key={ai.key}
                      className={`rounded-xl border p-3 backdrop-blur-md transition-all duration-500 ${CARD_STATUS[statuses[ai.key]]}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{ai.icon}</span>
                        <span className="font-mono text-sm font-bold text-white">{ai.label}</span>
                        <span className="ml-auto">
                          {statuses[ai.key] === "loading" && (
                            <span className="flex gap-0.5">
                              {[0, 1, 2].map(i => (
                                <span
                                  key={i}
                                  className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                                  style={{ animationDelay: `${i * 0.12}s` }}
                                />
                              ))}
                            </span>
                          )}
                          {statuses[ai.key] === "done" && (
                            <span className="text-emerald-400 text-xs font-mono">✓ 完了</span>
                          )}
                          {statuses[ai.key] === "error" && (
                            <span className="text-red-400 text-xs font-mono">✗ エラー</span>
                          )}
                        </span>
                      </div>
                      <div className="text-slate-400 text-xs font-mono mt-0.5">{ai.modelName}</div>
                    </div>
                  ))}
                </div>

                {/* Summary status (appears when all 3 done) */}
                {phase === "summarizing" && (
                  <div className={`rounded-xl border p-3 backdrop-blur-md transition-all ${CARD_STATUS[statuses.summary]}`}>
                    <div className="flex items-center gap-2">
                      <span>✨</span>
                      <span className="font-mono text-sm font-bold text-white">ChatGPT — 総合まとめ生成中</span>
                      {statuses.summary === "loading" && (
                        <span className="ml-auto flex gap-0.5">
                          {[0, 1, 2].map(i => (
                            <span
                              key={i}
                              className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                              style={{ animationDelay: `${i * 0.12}s` }}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Terminal window */}
                <div className="flex-1 bg-black/80 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
                  {/* macOS-style title bar */}
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/70 border-b border-slate-700 shrink-0">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <span className="w-3 h-3 rounded-full bg-green-500/80" />
                    <span className="ml-2 text-slate-400 text-xs font-mono">ai-compare — bash</span>
                  </div>

                  {/* Log output */}
                  <div className="p-3 overflow-y-auto flex-1 font-mono text-xs space-y-0.5">
                    {logs.map(log => (
                      <div key={log.id} className={`flex gap-2 ${LOG_COLOR[log.type]}`}>
                        <span className="text-slate-600 shrink-0">[{log.time}]</span>
                        <span className="break-all">{log.text}</span>
                      </div>
                    ))}
                    {/* Blinking cursor */}
                    <div className="text-emerald-400 flex items-center gap-1">
                      <span>$</span>
                      <span className="inline-block w-2 h-3 bg-emerald-400 animate-pulse" />
                    </div>
                    <div ref={logsEndRef} />
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-5 py-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* ── Results ── */}
        {phase === "done" && (
          <div className="space-y-6">
            {/* 3 AI cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {AI_CONFIG.map(ai => (
                <div key={ai.key} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
                  <div className={`${ai.headerClass} px-5 py-3 flex items-center gap-2`}>
                    <span className="text-lg">{ai.icon}</span>
                    <span className="font-semibold text-white">{ai.label}</span>
                    <span className="ml-auto text-white/60 text-xs font-mono">{ai.modelName}</span>
                  </div>
                  <div className="px-5 py-4 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                    {responses[ai.key]}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-slate-800 rounded-2xl border border-purple-700/50 overflow-hidden shadow-xl">
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 px-6 py-4 flex items-center gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <p className="font-bold text-white text-lg">ChatGPT による総合まとめ</p>
                  <p className="text-blue-200 text-xs">3つの回答を統合・整理した総合回答</p>
                </div>
              </div>
              <div className="px-6 py-5 text-slate-200 text-base leading-relaxed whitespace-pre-wrap">
                {summary}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
