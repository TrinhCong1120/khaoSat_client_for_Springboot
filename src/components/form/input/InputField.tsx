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
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
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
  autoComplete,
  inputMode,
  success = false,
  error = false,
  hint,
}) => {
  let inputClasses = `min-h-11 w-full min-w-0 rounded-lg border bg-white px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 dark:bg-gray-900 ${className}`;

  if (disabled) {
    inputClasses += ` cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400`;
  } else if (error) {
    inputClasses += ` border-error-500 text-error-700 dark:text-error-300`;
  } else if (success) {
    inputClasses += ` border-success-500 text-success-700 dark:text-success-300`;
  } else {
    inputClasses += ` border-gray-300 text-gray-800 transition-[border-color,box-shadow] focus-visible:border-brand-500 focus-visible:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-gray-500`;
  }

  return (
    <div className="relative">
      <input
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        {...(value !== undefined ? { value } : { defaultValue })}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        inputMode={inputMode}
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
