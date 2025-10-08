import React, { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';

interface BaseFormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  className?: string;
}

interface InputFormFieldProps extends BaseFormFieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  as?: 'input';
}

interface TextareaFormFieldProps extends BaseFormFieldProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  as: 'textarea';
  rows?: number;
}

type FormFieldProps = InputFormFieldProps | TextareaFormFieldProps;

/**
 * FormField component with validation support
 *
 * Features:
 * - Error message display
 * - Helper text
 * - Required field indicator
 * - Accessible labels
 * - Support for input and textarea
 */
const FormField = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, FormFieldProps>(
  ({ label, error, required, helperText, className = '', as = 'input', ...props }, ref) => {
    const hasError = !!error;
    const id = props.id || props.name || `field-${Math.random().toString(36).substr(2, 9)}`;

    const baseInputClasses = `
      w-full px-4 py-2.5
      border rounded-xl
      transition-all duration-200
      focus:outline-none focus:ring-2
      disabled:opacity-50 disabled:cursor-not-allowed
      dark:bg-gray-800 dark:text-gray-100
    `;

    const errorClasses = hasError
      ? `
        border-red-300 dark:border-red-700
        focus:ring-red-500 focus:border-red-500
        bg-red-50 dark:bg-red-900/10
      `
      : `
        border-gray-200 dark:border-gray-700
        focus:ring-primary-500 focus:border-primary-500
        bg-white dark:bg-gray-800
      `;

    const inputClasses = `${baseInputClasses} ${errorClasses} ${className}`;

    const renderInput = () => {
      if (as === 'textarea') {
        const { rows = 3, ...textareaProps } = props as TextareaFormFieldProps;
        return (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={id}
            className={inputClasses}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined}
            aria-required={required}
            rows={rows}
            {...textareaProps}
          />
        );
      }

      return (
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          id={id}
          className={inputClasses}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          aria-required={required}
          {...(props as InputFormFieldProps)}
        />
      );
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2"
          >
            {label}
            {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
          </label>
        )}

        {renderInput()}

        {/* Error message */}
        {hasError && (
          <div
            id={`${id}-error`}
            className="mt-2 flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Helper text */}
        {!hasError && helperText && (
          <p
            id={`${id}-helper`}
            className="mt-2 text-sm text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

export default FormField;


interface SelectFieldProps extends BaseFormFieldProps, Omit<InputHTMLAttributes<HTMLSelectElement>, 'className'> {
  options: Array<{ value: string | number; label: string }>;
  placeholder?: string;
}

/**
 * SelectField component with validation support
 */
export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, required, helperText, options, placeholder, className = '', ...props }, ref) => {
    const hasError = !!error;
    const id = props.id || props.name || `select-${Math.random().toString(36).substr(2, 9)}`;

    const baseClasses = `
      w-full px-4 py-2.5
      border rounded-xl
      transition-all duration-200
      focus:outline-none focus:ring-2
      disabled:opacity-50 disabled:cursor-not-allowed
      dark:bg-gray-800 dark:text-gray-100
    `;

    const errorClasses = hasError
      ? `
        border-red-300 dark:border-red-700
        focus:ring-red-500 focus:border-red-500
        bg-red-50 dark:bg-red-900/10
      `
      : `
        border-gray-200 dark:border-gray-700
        focus:ring-primary-500 focus:border-primary-500
        bg-white dark:bg-gray-800
      `;

    const selectClasses = `${baseClasses} ${errorClasses} ${className}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2"
          >
            {label}
            {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
          </label>
        )}

        <select
          ref={ref}
          id={id}
          className={selectClasses}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          aria-required={required}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* Error message */}
        {hasError && (
          <div
            id={`${id}-error`}
            className="mt-2 flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Helper text */}
        {!hasError && helperText && (
          <p
            id={`${id}-helper`}
            className="mt-2 text-sm text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';
