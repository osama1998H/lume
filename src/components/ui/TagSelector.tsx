import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tag } from '../../types';

export interface TagSelectorProps {
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
  availableTags?: Tag[];
  allowCreate?: boolean;
  placeholder?: string;
  className?: string;
  icon?: LucideIcon;
}

/**
 * TagSelector component for selecting and managing tags
 * Supports multi-select, inline display, and optional tag creation
 */
const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onChange,
  availableTags = [],
  allowCreate = false,
  placeholder = 'Add tags...',
  className = '',
  icon: Icon,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allTags, setAllTags] = useState<Tag[]>(availableTags);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load tags if not provided
  useEffect(() => {
    if (availableTags.length === 0) {
      loadTags();
    } else {
      setAllTags(availableTags);
    }
  }, [availableTags]);

  const loadTags = async (): Promise<Tag[]> => {
    try {
      if (window.electronAPI) {
        const tags = await window.electronAPI.getTags();
        setAllTags(tags);
        return tags;
      }
      return [];
    } catch (error) {
      console.error('Failed to load tags:', error);
      return [];
    }
  };

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

  const handleTagSelect = (tag: Tag) => {
    const isSelected = selectedTags.some((t) => t.id === tag.id);
    if (isSelected) {
      onChange(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const handleTagRemove = (tagId: number) => {
    onChange(selectedTags.filter((t) => t.id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!searchQuery.trim() || !allowCreate || !window.electronAPI) return;

    try {
      // Generate a random color for the new tag
      const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newTagId = await window.electronAPI.addTag({
        name: searchQuery.trim(),
        color: randomColor,
      });

      // Reload tags and select the new one
      const tags = await loadTags();
      const newTag = tags.find((t) => t.id === newTagId);
      if (newTag) {
        handleTagSelect(newTag);
      }
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const filteredTags = allTags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isTagSelected = (tagId: number) => selectedTags.some((t) => t.id === tagId);

  const canCreateNewTag =
    allowCreate &&
    searchQuery.trim() &&
    !allTags.some((t) => t.name.toLowerCase() === searchQuery.toLowerCase());

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Icon */}
      {Icon && (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
      )}

      {/* Selected Tags Display + Input */}
      <div
        className={`min-h-[42px] w-full py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 cursor-text flex flex-wrap items-center gap-2 ${Icon ? 'pl-10 pr-3' : 'px-3'}`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-white text-sm font-medium"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleTagRemove(tag.id!);
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
          placeholder={selectedTags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredTags.length === 0 && !canCreateNewTag ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              {t('categories.noTagsAvailable', 'No tags available')}
            </div>
          ) : (
            <>
              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagSelect(tag)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between gap-2 ${
                    isTagSelected(tag.id!)
                      ? 'bg-gray-50 dark:bg-gray-700/50'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {tag.name}
                    </span>
                  </div>
                  {isTagSelected(tag.id!) && (
                    <div className="w-4 h-4 rounded-full bg-primary-600 dark:bg-primary-500 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))}
              {canCreateNewTag && (
                <button
                  type="button"
                  onClick={handleCreateTag}
                  className="w-full px-3 py-2 text-left hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center gap-2 border-t border-gray-200 dark:border-gray-700"
                >
                  <Plus className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  <span className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                    Create "{searchQuery}"
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TagSelector;
