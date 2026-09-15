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
      className="fixed inset-0 z-99999 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={blocking ? undefined : onClose}
    >
      <div
        className={`relative w-full ${className || "max-w-lg"} bg-white rounded-2xl shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        {(title || description) && (
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-3">
            <div>
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
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-500 dark:hover:text-gray-300 transition-colors shrink-0"
              >
                <CloseIcon className="w-5 h-5" />
                <span className="sr-only">Đóng</span>
              </button>
            )}
          </div>
        )}

        {/* CONTENT */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;