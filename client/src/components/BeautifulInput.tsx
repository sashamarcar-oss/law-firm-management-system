type BeautifulInputProps<T = string> = {
  label: string;
  value: T;
  onChange: (val: T) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  options?: { value: T; label: string }[];
  disabled?: boolean;
};

export default function BeautifulInput<T extends string = string>({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  error,
  options,
  disabled = false,
}: BeautifulInputProps<T>) {
  // ───────── SELECT INPUT ─────────
  if (options && options.length > 0) {
    return (
      <div className="relative w-full mb-4">
        <label className="absolute -top-2 left-3 bg-white px-1 text-gray-500 text-sm">{label}</label>
        <select
          value={options.some((opt) => opt.value === value) ? value : ""} // safe type
          onChange={(e) => onChange(e.target.value as T)} // cast string to T
          disabled={disabled}
          className={`w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
            error ? "border-red-500" : ""
          }`}
          aria-label={label}
          aria-invalid={!!error}
        >
          <option value="">{placeholder || "Select an option"}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  }

  // ───────── TEXT INPUT ─────────
  return (
    <div className="relative w-full mb-4">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        placeholder={placeholder || " "}
        disabled={disabled}
        className={`peer w-full border border-gray-300 rounded-lg px-3 pt-5 pb-2 text-gray-900 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
          error ? "border-red-500" : ""
        }`}
        aria-label={label}
        aria-invalid={!!error}
      />
      <label className="absolute left-3 top-2 text-gray-500 text-sm transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-gray-500 peer-focus:text-sm">
        {label}
      </label>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}