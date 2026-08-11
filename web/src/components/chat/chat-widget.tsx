"use client";

import { useState, useRef, useEffect } from "react";

type ChatMessage = { role: "assistant" | "user"; content: string };

type ChatApiResponse = {
  session_id: string;
  reply: string;
  done: boolean;
  lead_id?: string | null;
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function openChat() {
    setOpen(true);
    if (sessionId || messages.length > 0) return;

    setLoading(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = (await res.json()) as ChatApiResponse;
    setSessionId(data.session_id);
    setMessages([{ role: "assistant", content: data.reply }]);
    setLoading(false);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !sessionId || loading || done) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message: userMessage }),
    });
    const data = (await res.json()) as ChatApiResponse;
    setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    setDone(data.done);
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        onClick={openChat}
        className="fixed bottom-6 right-6 rounded-full bg-black px-5 py-3 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-black"
      >
        Chat with us
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 flex h-[32rem] w-80 flex-col rounded-lg border border-black/10 bg-white shadow-xl dark:border-white/15 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/15">
        <span className="text-sm font-medium">Chat</span>
        <button onClick={() => setOpen(false)} className="text-sm opacity-60 hover:opacity-100">
          Close
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === "assistant"
                ? "bg-black/5 dark:bg-white/10"
                : "ml-auto bg-black text-white dark:bg-white dark:text-black"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && <div className="text-xs opacity-50">...</div>}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 border-t border-black/10 p-3 dark:border-white/15">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading || done || !sessionId}
          placeholder={done ? "Conversation complete" : "Type your answer..."}
          className="flex-1 rounded-md border border-black/15 px-2 py-1.5 text-sm disabled:opacity-50 dark:border-white/20 dark:bg-transparent"
        />
        <button
          type="submit"
          disabled={loading || done || !sessionId}
          className="rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Send
        </button>
      </form>
    </div>
  );
}
