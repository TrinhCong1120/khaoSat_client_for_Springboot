"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

import Modal from "@/components/ui/modal/Modal";
import TypingIndicator from "@/components/chat/TypingIndicator";
import { getApiErrorMessage } from "@/lib/apiError";
import { API_CHATBOT } from "@/lib/api";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

type RagQueryResponse = {
  query?: string;
  answer?: string;
  hasContext?: boolean;
  chunksReturned?: number;
  /**
   * Độ tương đồng vector (inner product sau chuẩn hóa, gần cosine), không còn là “điểm từ khóa” —
   * không so sánh với ngưỡng số cũ từ API trước khi chuyển sang embedding.
   */
  scoreMax?: number;
  usedLlm?: boolean;
  context?: string;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const CHATBOT_BASE = API_CHATBOT;

function getRagQueryUrl() {
  return `${CHATBOT_BASE}/rag/query`;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [includeContext, setIncludeContext] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: uid(),
      role: "assistant",
      text: "Chào bạn! Bạn cần tư vấn gì về khảo sát/nhà ở xã hội?",
    },
  ]);
  const [isWaiting, setIsWaiting] = useState(false);

  const apiUrl = useMemo(() => getRagQueryUrl(), []);
  const ragApiKey = process.env.NEXT_PUBLIC_RAG_API_KEY ?? "";
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [isOpen, messages, isWaiting]);

  const send = async () => {
    const query = input.trim();
    if (!query) return;
    if (isWaiting) return;

    if (!ragApiKey.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text:
            "Chưa cấu hình khóa API cho chatbot. Thêm NEXT_PUBLIC_RAG_API_KEY trong môi trường client.",
        },
      ]);
      return;
    }

    setInput("");
    const userMsg: ChatMessage = { id: uid(), role: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);

    setIsWaiting(true);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ragApiKey.trim(),
        },
        body: JSON.stringify({ query, includeContext }),
      });

      let data: unknown;
      const contentType = res.headers.get("content-type") || "";
      try {
        if (contentType.includes("application/json")) {
          data = await res.json();
        } else {
          const text = await res.text();
          data = text.trim() ? text : null;
        }
      } catch {
        throw new Error("Response không hợp lệ từ server");
      }

      if (res.status === 503) {
        const msg =
          getApiErrorMessage(
            data,
            "Embedding hoặc truy vấn RAG tạm thời lỗi (ví dụ Ollama timeout). Vui lòng thử lại sau."
          ) ||
          "Embedding hoặc truy vấn RAG tạm thời lỗi (ví dụ Ollama timeout). Vui lòng thử lại sau.";
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", text: msg },
        ]);
        return;
      }

      if (!res.ok) {
        const msg = getApiErrorMessage(data, `Lỗi ${res.status}`);
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", text: msg || "Có lỗi xảy ra." },
        ]);
        return;
      }

      const answerObj =
        typeof data === "object" && data !== null
          ? (data as RagQueryResponse)
          : null;
      const answer =
        answerObj && typeof answerObj.answer === "string" && answerObj.answer.trim()
          ? answerObj.answer
          : "Mình chưa nhận được câu trả lời từ hệ thống.";

      let fullText = answer;
      if (
        includeContext &&
        answerObj &&
        typeof answerObj.context === "string" &&
        answerObj.context.trim()
      ) {
        fullText = `${answer}\n\n--- Ngữ cảnh ---\n${answerObj.context.trim()}`;
      }

      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", text: fullText },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text: e instanceof Error ? e.message : "Lỗi kết nối server",
        },
      ]);
    } finally {
      setIsWaiting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group fixed bottom-6 right-6 z-[999999] h-14 w-14 rounded-full text-white shadow-theme-xl transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 ring-1 ring-white/20"
        aria-label="Mở tư vấn"
      >

        <span className="pointer-events-none absolute inset-0 rounded-full bg-brand-500/30 blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
        <span className="pointer-events-none absolute -inset-1 rounded-full animate-ping bg-brand-500/30" />

        <span className="pointer-events-none absolute -top-1 -right-1 inline-flex items-center gap-1 rounded-full bg-white text-gray-900 text-[10px] font-bold px-2 py-0.5 shadow-theme-sm ring-1 ring-gray-200">
          <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
          AI
        </span>

        <MessageCircle className="relative h-6 w-6 drop-shadow" />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (isWaiting) return;
          setIsOpen(false);
        }}
        className="max-w-2xl"
        title="Tư vấn"
        description="Hỏi nhanh về khảo sát/nhà ở xã hội"
      >
        <div className="flex flex-col h-[70vh]">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800 mb-2" style={{ display: 'none' }}>
            <label className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none" >
              <input
                type="checkbox"
                checked={includeContext}
                onChange={(e) => setIncludeContext(e.target.checked)}
                disabled={isWaiting}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Gửi kèm ngữ cảnh (debug)
            </label>
          </div>
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3"
          >
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={
                      isUser
                        ? "max-w-[85%] rounded-2xl rounded-br-sm bg-brand-500 text-white px-4 py-2 text-sm shadow-theme-xs"
                        : "max-w-[85%] rounded-2xl rounded-bl-sm bg-gray-100 dark:bg-gray-800/60 text-gray-800 dark:text-gray-100 px-4 py-2 text-sm border border-gray-200 dark:border-gray-800"
                    }
                  >
                    <div className="whitespace-pre-wrap break-words">{m.text}</div>
                  </div>
                </div>
              );
            })}

            {isWaiting && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-gray-100 dark:bg-gray-800/60 text-gray-800 dark:text-gray-100 px-4 py-3 text-sm border border-gray-200 dark:border-gray-800 inline-flex items-center gap-2">
                  <TypingIndicator />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Đang trả lời…
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-end gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              disabled={isWaiting}
              rows={2}
              placeholder="Nhập câu hỏi…"
              className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:shadow-focus-ring disabled:opacity-60"
            />

            <button
              type="button"
              onClick={() => void send()}
              disabled={isWaiting || !input.trim()}
              className="h-10 w-10 rounded-xl bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-60 disabled:hover:bg-brand-500 transition-colors inline-flex items-center justify-center"
              aria-label="Gửi"
            >
              <Send className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isWaiting}
              className="h-10 w-10 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 disabled:opacity-60 transition-colors inline-flex items-center justify-center"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
