import React, { useEffect } from "react";
import { CloseIcon } from "@/icons";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Khi true: không đóng bằng backdrop, Esc, hoặc nút X (dùng khi đang xử lý bất đồng bộ). */
  blocking?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  blocking = false,
}) => {
  useEffect(() => {
    if (blocking) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose, blocking]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto overscroll-contain bg-gray-950/65 p-3 backdrop-blur-sm sm:p-6"
      onClick={blocking ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || "Hộp thoại"}
        className={`relative max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto ${className || "max-w-lg"} rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:max-h-[calc(100dvh-3rem)]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        {(title || description) && (
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5">
            <div className="min-w-0">
              {title && (
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-gray-500 mt-1">
                  {description}
                </p>
              )}
            </div>
            {!blocking && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng hộp thoại"
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-500 dark:hover:text-gray-300 transition-colors shrink-0"
              >
                <CloseIcon className="w-5 h-5" />
                <span className="sr-only">Đóng</span>
              </button>
            )}
          </div>
        )}

        {/* CONTENT */}
        <div className="min-w-0 p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
