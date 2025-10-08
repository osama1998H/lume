import * as React from 'react';
import { Tag } from 'lucide-react';
import { Label } from './label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { cn } from '@/lib/utils';

export interface Category {
  id: number;
  name: string;
  color: string;
}

export interface CategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  categories: Category[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

export const CategorySelect = React.forwardRef<
  HTMLButtonElement,
  CategorySelectProps
>(
  (
    {
      value,
      onValueChange,
      categories,
      placeholder = 'Select category',
      label,
      disabled,
      error,
      required,
    },
    ref
  ) => {
    const selectedCategory = categories.find(
      (cat) => cat.id?.toString() === value
    );

    return (
      <div className="w-full space-y-2">
        {label && (
          <Label className={cn(disabled && 'opacity-50')}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}

        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
            <Tag className="h-5 w-5 text-muted-foreground" />
          </div>

          <Select value={value} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger
              ref={ref}
              className={cn(
                'pl-10',
                error && 'border-destructive focus:ring-destructive'
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <SelectValue placeholder={placeholder} />
                {selectedCategory && (
                  <div
                    className="ml-auto w-4 h-4 rounded-full border-2 border-background flex-shrink-0"
                    style={{ backgroundColor: selectedCategory.color }}
                  />
                )}
              </div>
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <span>{category.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

CategorySelect.displayName = 'CategorySelect';
