import React, { useState, useEffect, useRef } from 'react';
import { X, LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Category } from '../../types';

export interface CategorySelectorProps {
  selectedCategories: Category[];
  onChange: (categories: Category[]) => void;
  availableCategories?: Category[];
  placeholder?: string;
  className?: string;
  icon?: LucideIcon;
}

/**
 * CategorySelector component for selecting and managing categories
 * Supports multi-select and inline display with colored pills
 */
const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategories,
  onChange,
  availableCategories = [],
  placeholder = 'Select categories...',
  className = '',
  icon: Icon,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategorySelect = (category: Category) => {
    // Guard against categories without IDs
    if (category.id == null) return;

    const isSelected = selectedCategories.some((c) => c.id === category.id);
    if (isSelected) {
      onChange(selectedCategories.filter((c) => c.id !== category.id));
    } else {
      onChange([...selectedCategories, category]);
    }
  };

  const handleCategoryRemove = (categoryId: number | undefined) => {
    // Guard against undefined IDs
    if (categoryId == null) return;
    onChange(selectedCategories.filter((c) => c.id !== categoryId));
  };

  const filteredCategories = availableCategories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isCategorySelected = (categoryId: number | undefined) =>
    categoryId != null && selectedCategories.some((c) => c.id === categoryId);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Icon */}
      {Icon && (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
      )}

      {/* Selected Categories Display + Input */}
      <div
        className={`min-h-[42px] w-full py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 cursor-text flex flex-wrap items-center gap-2 ${Icon ? 'pl-10 pr-3' : 'px-3'}`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {selectedCategories.map((category, index) => (
          <span
            key={category.id ?? `category-${index}`}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-white text-sm font-medium"
            style={{ backgroundColor: category.color }}
          >
            {category.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCategoryRemove(category.id);
              }}
              className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={selectedCategories.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredCategories.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              {t('categories.noCategoriesAvailable', 'No categories available')}
            </div>
          ) : (
            <>
              {filteredCategories.map((category, index) => (
                <button
                  key={category.id ?? `category-${index}`}
                  type="button"
                  onClick={() => handleCategorySelect(category)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between gap-2 ${
                    isCategorySelected(category.id)
                      ? 'bg-gray-50 dark:bg-gray-700/50'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {category.name}
                    </span>
                  </div>
                  {isCategorySelected(category.id) && (
                    <div className="w-4 h-4 rounded-full bg-primary-600 dark:bg-primary-500 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CategorySelector;
