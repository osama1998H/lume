import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface DropdownSelectorProps<T> {
  items: T[];
  selectedItem: T | null;
  onChange: (item: T | null) => void;
  renderItem: (item: T) => React.ReactNode;
  getItemKey: (item: T) => string | number;
  searchFilter: (item: T, searchQuery: string) => boolean;
  placeholder?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  renderTrigger?: (selectedItem: T | null, isOpen: boolean) => React.ReactNode;
  showSearch?: boolean;
  disabled?: boolean;
  clearable?: boolean;
}

export function DropdownSelector<T>({
  items,
  selectedItem,
  onChange,
  renderItem,
  getItemKey,
  searchFilter,
  placeholder = 'Select item',
  emptyMessage = 'No items available',
  searchPlaceholder = 'Search...',
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  renderTrigger,
  showSearch = true,
  disabled = false,
  clearable = true,
}: DropdownSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Filter items based on search query
  const filteredItems = searchQuery
    ? items.filter((item) => searchFilter(item, searchQuery))
    : items;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when dropdown opens
      if (showSearch) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, showSearch]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
        break;

      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => {
          const nextIndex = prev < filteredItems.length - 1 ? prev + 1 : 0;
          // Scroll into view
          itemRefs.current[nextIndex]?.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth',
          });
          return nextIndex;
        });
        break;

      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => {
          const nextIndex = prev > 0 ? prev - 1 : filteredItems.length - 1;
          // Scroll into view
          itemRefs.current[nextIndex]?.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth',
          });
          return nextIndex;
        });
        break;

      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredItems.length) {
          handleSelect(filteredItems[focusedIndex]);
        }
        break;

      default:
        break;
    }
  };

  const handleSelect = (item: T) => {
    onChange(item);
    setIsOpen(false);
    setSearchQuery('');
    setFocusedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (isOpen) {
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          flex items-center justify-between gap-2
          transition-all duration-200
          ${buttonClassName}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {renderTrigger ? (
          renderTrigger(selectedItem, isOpen)
        ) : (
          <>
            <span className="truncate">
              {selectedItem ? renderItem(selectedItem) : placeholder}
            </span>
            <div className="flex items-center gap-1">
              {clearable && selectedItem && !disabled && (
                <X
                  className="h-4 w-4 hover:text-red-500 dark:hover:text-red-400"
                  onClick={handleClear}
                />
              )}
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`
            absolute right-0 mt-2 w-full min-w-[280px] max-w-sm
            bg-white dark:bg-gray-800
            border border-gray-300 dark:border-gray-600
            rounded-lg shadow-lg
            z-50
            ${dropdownClassName}
          `}
          role="listbox"
          onKeyDown={handleKeyDown}
        >
          {/* Search Input */}
          {showSearch && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFocusedIndex(-1);
                  }}
                  placeholder={searchPlaceholder}
                  className="
                    w-full pl-9 pr-3 py-2
                    bg-gray-50 dark:bg-gray-900
                    border border-gray-200 dark:border-gray-700
                    rounded-md
                    text-sm text-gray-900 dark:text-gray-100
                    placeholder-gray-400 dark:placeholder-gray-500
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  "
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="max-h-64 overflow-y-auto py-1">
            {filteredItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {emptyMessage}
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const key = getItemKey(item);
                const isSelected = selectedItem && getItemKey(selectedItem) === key;
                const isFocused = index === focusedIndex;

                return (
                  <div
                    key={key}
                    ref={(el) => (itemRefs.current[index] = el)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(item)}
                    className={`
                      px-4 py-2.5 cursor-pointer
                      transition-colors duration-150
                      ${
                        isSelected
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                          : isFocused
                          ? 'bg-gray-100 dark:bg-gray-700'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                      }
                    `}
                  >
                    {renderItem(item)}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
