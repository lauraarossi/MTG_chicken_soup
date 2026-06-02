"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import type { Message } from "@/types";

interface Props {
  initialMessage?: string;
  deckId?: number;
  onSaveDeck?: (text: string) => Promise<void>;
}

function extractDecklist(text: string): string | null {
  const lines = text.split("\n").filter((line) => {
    const t = line.trim();
    return /^\d+x?\s+\S/.test(t) || /^\/\//.test(t);
  });
  return lines.length > 0 ? lines.join("\n") : null;
}

export default function ChatInterface({ initialMessage, deckId, onSaveDeck }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [savedMsgId, setSavedMsgId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    if (initialMessage && !sentInitial.current) {
      sentInitial.current = true;
      sendMessage(initialMessage);
    }
  }, [initialMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const optimisticMsg: Message = {
      id: Date.now(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setLoading(true);

    try {
      const convo = await api.chat.send(text, conversationId, deckId);
      setConversationId(convo.id);
      setMessages(convo.messages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDeck(msg: Message) {
    if (!onSaveDeck) return;
    await onSaveDeck(msg.content);
    setSavedMsgId(msg.id);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col h-[600px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">
            Ask anything about your deck...
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              }`}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-p:my-1 prose-li:my-0 prose-ul:my-1">
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
            {msg.role === "assistant" && onSaveDeck && extractDecklist(msg.content) && (
              <button
                onClick={() => handleSaveDeck(msg)}
                className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {savedMsgId === msg.id ? "Saved to deck ✓" : "Save as decklist"}
              </button>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              Thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your deck..."
          disabled={loading}
          className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 dark:disabled:bg-gray-800"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
