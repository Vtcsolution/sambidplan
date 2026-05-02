import React, { useState } from 'react';

/**
 * Input Component - Complete form input with all variations
 * 
 * @param {string} label - Input label text
 * @param {string} type - Input type (text, email, password, number, tel, url, search)
 * @param {string} name - Input name attribute
 * @param {string} value - Input value
 * @param {function} onChange - Change handler
 * @param {string} placeholder - Placeholder text
 * @param {string} error - Error message
 * @param {string} hint - Helper text
 * @param {boolean} required - Required field
 * @param {boolean} disabled - Disabled state
 * @param {boolean} readOnly - Read-only state
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {string} variant - 'default' | 'filled' | 'flushed'
 * @param {string} icon - Icon component or emoji
 * @param {string} iconPosition - 'left' | 'right'
 * @param {function} onIconClick - Click handler for icon
 * @param {boolean} showPasswordToggle - Show/hide password toggle
 * @param {string} className - Additional CSS classes
 */

export default function Input({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  hint,
  required = false,
  disabled = false,
  readOnly = false,
  size = 'md',
  variant = 'default',
  icon,
  iconPosition = 'left',
  onIconClick,
  showPasswordToggle = false,
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  
  // Handle password visibility
  const inputType = showPasswordToggle && type === 'password'
    ? (showPassword ? 'text' : 'password')
    : type;

  // Size classes
  const sizes = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-3 text-lg',
  };

  // Variant classes
  const variants = {
    default: 'border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
    filled: 'bg-gray-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
    flushed: 'border-b border-gray-300 rounded-none px-0 focus:border-indigo-500 focus:ring-0',
  };

  // Icon padding adjustments
  const getPaddingForIcon = () => {
    if (!icon) return '';
    return iconPosition === 'left' ? 'pl-10' : 'pr-10';
  };

  // Base input classes
  const baseInputClasses = `
    w-full 
    rounded-lg 
    transition-all 
    duration-200 
    outline-none
    disabled:bg-gray-100 
    disabled:cursor-not-allowed
    read-only:bg-gray-50
    read-only:cursor-default
    ${sizes[size]}
    ${variants[variant]}
    ${getPaddingForIcon()}
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={`mb-4 ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input wrapper for icons */}
      <div className="relative">
        {/* Left Icon */}
        {icon && iconPosition === 'left' && (
          <div 
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 
              ${onIconClick ? 'cursor-pointer hover:text-gray-600' : ''}`}
            onClick={onIconClick}
          >
            {icon}
          </div>
        )}

        {/* Input field */}
        <input
          type={inputType}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          className={baseInputClasses}
          {...props}
        />

        {/* Password toggle button */}
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            {showPassword ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </button>
        )}

        {/* Right Icon */}
        {icon && iconPosition === 'right' && !showPasswordToggle && (
          <div 
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 
              ${onIconClick ? 'cursor-pointer hover:text-gray-600' : ''}`}
            onClick={onIconClick}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}

      {/* Hint text */}
      {hint && !error && (
        <p className="mt-1 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
}

// Sub-component: TextArea
export function TextArea({
  label,
  name,
  value,
  onChange,
  placeholder,
  rows = 4,
  error,
  hint,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        required={required}
        className={`
          w-full px-3 py-2 border rounded-lg 
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          transition-all duration-200
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}

// Sub-component: Select
export function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  error,
  hint,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`
          w-full px-3 py-2 border rounded-lg 
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}

// Sub-component: Checkbox
export function Checkbox({
  label,
  name,
  checked,
  onChange,
  error,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="flex items-center">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={`
            h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error ? 'border-red-500' : ''}
          `}
          {...props}
        />
        <span className="ml-2 text-sm text-gray-700">{label}</span>
      </label>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// Sub-component: Radio Group
export function RadioGroup({
  label,
  name,
  value,
  onChange,
  options = [],
  error,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={onChange}
              disabled={disabled}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              {...props}
            />
            <span className="ml-2 text-sm text-gray-700">{option.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}