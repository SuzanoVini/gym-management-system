'use client';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'date' | 'number';
  value: string | number | readonly string[];
  onChange: (value: string | number | readonly string[]) => void;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  error?: string;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
}

export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  options,
  error,
  disabled = false,
  className = '',
  min,
  max,
}: FormFieldProps) {
  const baseInputClasses = `
    ${type === 'select' ? 'form-select' : 'form-input'}
    ${error ? '!border-red-300' : ''}
    ${disabled ? '!bg-gray-100 !cursor-not-allowed' : ''}
    ${className}
  `;

  const inputElement = () => {
    switch (type) {
      case 'select':
        return (
          <select
            id={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={baseInputClasses}
            required={required}
          >
            <option value="">Select {label}</option>
            {options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            id={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClasses}
            required={required}
            rows={3}
          />
        );

      case 'number':
        return (
          <input
            id={name}
            type={type}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClasses}
            required={required}
            min={min}
            max={max}
          />
        );

      default:
        return (
          <input
            id={name}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClasses}
            required={required}
          />
        );
    }
  };

  return (
    <div className="mb-4">
      <label htmlFor={name} className="form-label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {inputElement()}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface FormProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Form({
  children,
  onSubmit,
  loading = false,
  disabled = false,
  className = '',
}: FormProps) {
  return (
    <form onSubmit={onSubmit} className={`space-y-4 ${className}`}>
      {children}
      <button type="submit" disabled={loading || disabled} className="btn btn-primary w-full">
        {loading ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
