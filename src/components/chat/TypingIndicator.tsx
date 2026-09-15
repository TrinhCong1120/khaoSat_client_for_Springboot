import React from "react";

export default function TypingIndicator({ label = "Đang trả lời" }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <span className="sr-only">{label}</span>
      <span className="inline-flex items-center gap-1">
        <span
          className="h-1.5 w-1.5 rounded-full bg-gray-400/80 dark:bg-gray-500/80 animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-gray-400/80 dark:bg-gray-500/80 animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-gray-400/80 dark:bg-gray-500/80 animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </span>
    </div>
  );
}

