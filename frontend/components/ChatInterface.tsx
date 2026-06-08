"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import type { Message } from "@/types";

interface Props {
  initialMessage?: string;
  deckId?: number;
  systemContext?: string;
  onSaveDeck?: (text: string) => Promise<void>;
  onCreateDeck?: (text: string) => void;
  accentColor?: string;
  frameColors?: string[];  // hex color array for gradient button; falls back to accentColor
  placeholder?: string;
}

function extractDecklist(text: string): string | null {
  const lines = text.split("\n").filter((line) => {
    const t = line.trim();
    return /^\d+x?\s+\S/.test(t) || /^\/\//.test(t);
  });
  return lines.length > 0 ? lines.join("\n") : null;
}

export default function ChatInterface({ initialMessage, deckId, systemContext, onSaveDeck, onCreateDeck, accentColor = "#3b82f6", frameColors, placeholder = "Ask about your deck..." }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedMsgId, setSavedMsgId] = useState<number | null>(null);
  const conversationId = useRef<number | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    if (!initialMessage || sentInitial.current) return;
    sentInitial.current = true;
    const controller = new AbortController();
    sendMessage(initialMessage, controller.signal);
    return () => controller.abort();
  }, [initialMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string, signal?: AbortSignal) {
    const now = Date.now();
    const streamingId = now + 1;
    setMessages((prev) => [
      ...prev,
      { id: now, role: "user", content: text, created_at: new Date().toISOString() },
      { id: streamingId, role: "assistant", content: "", created_at: new Date().toISOString() },
    ]);
    setLoading(true);

    try {
      const { conversationId: cid, messageId: mid } = await api.chat.stream(
        text,
        (token) => {
          if (signal?.aborted) return;
          setMessages((prev) =>
            prev.map((m) => m.id === streamingId ? { ...m, content: m.content + token } : m)
          );
        },
        conversationId.current,
        deckId,
        systemContext,
        signal,
      );
      if (!signal?.aborted) {
        conversationId.current = cid;
        setMessages((prev) =>
          prev.map((m) => m.id === streamingId ? { ...m, id: mid } : m)
        );
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      console.error(e);
      setMessages((prev) => prev.filter((m) => m.id !== streamingId));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  const [extracting, setExtracting] = useState(false);

  async function handleSaveDeck(msg: Message) {
    if (!onSaveDeck) return;
    await onSaveDeck(msg.content);
    setSavedMsgId(msg.id);
  }

  async function handleExtractDeck() {
    if (!onCreateDeck || !conversationId.current) return;
    setExtracting(true);
    try {
      const { decklist } = await api.chat.extractDeck(conversationId.current);
      if (decklist.trim()) onCreateDeck(decklist);
    } finally {
      setExtracting(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col gap-2">
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl flex flex-col h-[420px] sm:h-[600px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="text-center text-gray-400 dark:text-slate-500 py-8 text-sm">
            {placeholder}
          </div>
        )}

        {messages.filter((m) => m.role !== "assistant" || m.content !== "").map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "text-white"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              }`}
              style={msg.role === "user" ? { backgroundColor: accentColor } : {}}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-p:my-1 prose-li:my-0 prose-ul:my-1">
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
            {msg.role === "assistant" && extractDecklist(msg.content) && (
              <div className="mt-1 flex gap-3">
                {onSaveDeck && (
                  <button
                    onClick={() => handleSaveDeck(msg)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {savedMsgId === msg.id ? "Saved to deck ✓" : "Save as decklist"}
                  </button>
                )}
                {onCreateDeck && (
                  <button
                    onClick={() => onCreateDeck(msg.content)}
                    className="text-xs text-green-600 dark:text-green-400 hover:underline"
                  >
                    Save as new deck
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && messages[messages.length - 1]?.content === "" && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-slate-700 p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={loading}
          className="flex-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 dark:disabled:bg-gray-800"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: accentColor }}
        >
          Send
        </button>
      </form>
    </div>
    {onCreateDeck && messages.length > 0 && (
      <button
        onClick={handleExtractDeck}
        disabled={extracting || loading}
        className="w-full py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity"
        style={
          frameColors && frameColors.length > 1
            ? { background: `linear-gradient(135deg, ${frameColors.join(", ")})` }
            : { backgroundColor: frameColors?.[0] ?? accentColor }
        }
      >
        {extracting ? "Extracting…" : "Extract & Save Deck"}
      </button>
    )}
    </div>
  );
}
