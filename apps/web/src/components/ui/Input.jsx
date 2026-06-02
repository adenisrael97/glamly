"use client";

export default function Input({
  label,
  error,
  hint,
  className = "",
  inputClassName = "",
  required,
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        className={`px-4 py-3 rounded-lg border text-sm text-gray-800 bg-white transition-all duration-200
          placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
          ${error
            ? "border-red-400 bg-red-50 focus:ring-red-300"
            : "border-gray-300 hover:border-purple-300"
          }
          ${inputClassName}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export function Textarea({ label, error, hint, className = "", required, ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        className={`px-4 py-3 rounded-lg border text-sm text-gray-800 bg-white transition-all duration-200 resize-none
          placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error
            ? "border-red-400 bg-red-50 focus:ring-red-300"
            : "border-gray-300 hover:border-purple-300"
          }`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export function Select({ label, error, hint, className = "", children, required, ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={`px-4 py-3 rounded-lg border text-sm text-gray-800 bg-white transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error
            ? "border-red-400 bg-red-50 focus:ring-red-300"
            : "border-gray-300 hover:border-purple-300"
          }`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}
