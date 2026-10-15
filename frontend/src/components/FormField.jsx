import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Accessible, reusable FormField component
 * Includes accessible aria attributes, label pairing, status icons, and validation message
 */
export const FormField = ({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error = null,
  isValid = false,
  helperText = null,
  icon: Icon = null,
  endAdornment = null,
  autoComplete = 'off',
  disabled = false,
  min,
  max,
  rows,
  as = 'input',
  children
}) => {
  const inputId = id || name;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const hasError = Boolean(error);

  const baseInputClasses = `
    w-full py-2.5 text-sm rounded-xl text-white placeholder-slate-500
    glass-input outline-none transition-all duration-200
    ${Icon ? 'pl-10' : 'pl-3.5'}
    ${endAdornment ? 'pr-10' : 'pr-3.5'}
    ${hasError 
      ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20' 
      : isValid 
        ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' 
        : 'border-white/15 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20'
    }
    ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-900/80' : ''}
  `;

  return (
    <div className="w-full space-y-1.5 text-left">
      {/* Accessible Label with Required Indicator */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-300 uppercase tracking-wider select-none"
        >
          {label}
          {required && (
            <span className="text-rose-400 ml-1" aria-hidden="true">*</span>
          )}
          {required && (
            <span className="sr-only"> (required)</span>
          )}
        </label>
        {helperText && !hasError && (
          <span id={helperId} className="text-[11px] text-slate-400">
            {helperText}
          </span>
        )}
      </div>

      {/* Input Container */}
      <div className="relative">
        {Icon && (
          <div
            className={`absolute ${as === 'textarea' ? 'top-3' : 'inset-y-0'} left-0 pl-3.5 flex items-center pointer-events-none text-slate-400`}
            aria-hidden="true"
          >
            <Icon className="w-4 h-4" />
          </div>
        )}

        {as === 'textarea' ? (
          <textarea
            id={inputId}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            rows={rows || 3}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
            className={`${baseInputClasses} resize-none`}
          />
        ) : as === 'select' ? (
          <select
            id={inputId}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            required={required}
            disabled={disabled}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
            className={`${baseInputClasses} bg-slate-900 cursor-pointer`}
          >
            {children}
          </select>
        ) : (
          <input
            id={inputId}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            autoComplete={autoComplete}
            min={min}
            max={max}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
            className={baseInputClasses}
          />
        )}

        {/* Right side adornment (e.g. password eye toggle or validation indicator) */}
        {endAdornment ? (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {endAdornment}
          </div>
        ) : isValid && !hasError && value ? (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-emerald-400">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          </div>
        ) : null}
      </div>

      {/* Accessible Error Message */}
      {hasError && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-xs text-rose-400 mt-1 font-medium flex items-center gap-1.5 animate-fadeIn"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

export default FormField;
