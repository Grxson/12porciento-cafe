interface FormFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  error?: string;
  type?: 'text' | 'email' | 'number' | 'password' | 'textarea' | 'select';
  options?: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
  rows?: number;
}

export default function FormField({
  label,
  value,
  onChange,
  error,
  type = 'text',
  options,
  required,
  placeholder,
  rows = 3,
}: FormFieldProps) {
  return (
    <div>
      <label className="block text-xs text-coffee-600 dark:text-coffee-400 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500 resize-none"
        />
      ) : type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
        >
          <option value="">-- Seleccionar --</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
        />
      )}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
