import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Input } from './input';
import { Label } from './label';
import { cn } from '@/lib/utils';

export interface InputWithIconProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

const InputWithIcon = React.forwardRef<HTMLInputElement, InputWithIconProps>(
  (
    {
      label,
      error,
      hint,
      icon: Icon,
      iconPosition = 'left',
      className,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || `input-${generatedId}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="w-full space-y-2">
        {label && (
          <Label htmlFor={inputId} className={cn(disabled && "opacity-50")}>
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}

        <div className="relative">
          {Icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}

          <Input
            ref={ref}
            id={inputId}
            className={cn(
              Icon && iconPosition === 'left' && 'pl-10',
              Icon && iconPosition === 'right' && 'pr-10',
              error && 'border-destructive focus-visible:ring-destructive',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? errorId : hint ? hintId : undefined
            }
            disabled={disabled}
            {...props}
          />

          {Icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}

        {!error && hint && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

InputWithIcon.displayName = 'InputWithIcon';

export default InputWithIcon;
