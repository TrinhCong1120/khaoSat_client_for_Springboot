import React, { FC } from "react";

interface InputProps {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | string;
  id?: string;
  name?: string;
  placeholder?: string;

  value?: string | number;
  defaultValue?: string | number;

  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;

  min?: string;
  max?: string;
  step?: number;

  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string;
}

const Input: FC<InputProps> = ({
  type = "text",
  id,
  name,
  placeholder,
  value, // ✅ thêm
  defaultValue,
  onChange,
  className = "",
  min,
  max,
  step,
  disabled = false,
  required = false,
  autoFocus = false,
  success = false,
  error = false,
  hint,
}) => {
  let inputClasses = `h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 ${className}`;

  if (disabled) {
    inputClasses += ` text-gray-500 border-gray-300 cursor-not-allowed`;
  } else if (error) {
    inputClasses += ` text-red-500 border-red-500`;
  } else if (success) {
    inputClasses += ` text-green-500 border-green-500`;
  } else {
    inputClasses += ` text-gray-800 dark:text-white/90 border-gray-300 dark:border-gray-700 focus:border-brand-400 dark:bg-gray-800/50 dark:placeholder:text-gray-500 transition-all shadow-sm focus:ring-brand-500/20`;
  }

  return (
    <div className="relative">
      <input
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        className={inputClasses}
      />

      {hint && (
        <p
          className={`mt-1.5 text-xs ${
            error
              ? "text-red-500"
              : success
              ? "text-green-500"
              : "text-gray-500"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;