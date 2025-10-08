import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Plus, Tag, Link } from 'lucide-react';
import { Category, Tag as TagType } from '../types';
import Button from './ui/Button';
import Skeleton from './ui/Skeleton';
import EmptyState from './ui/EmptyState';

const Categories: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'tags' | 'mappings'>('categories');

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#3B82F6', description: '' });
  const [tagForm, setTagForm] = useState({ name: '', color: '#8B5CF6' });
  const [mappingForm, setMappingForm] = useState({ type: 'app' as 'app' | 'domain', value: '', categoryId: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (window.electronAPI) {
        const [categoriesData, tagsData] = await Promise.all([
          window.electronAPI.getCategories(),
          window.electronAPI.getTags(),
        ]);
        setCategories(categoriesData);
        setTags(tagsData);
      }
    } catch (error) {
      console.error('Failed to load categories and tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      if (window.electronAPI) {
        await window.electronAPI.addCategory({
          name: categoryForm.name,
          color: categoryForm.color,
          description: categoryForm.description,
        });
        await loadData();
        setShowCategoryModal(false);
        setCategoryForm({ name: '', color: '#3B82F6', description: '' });
      }
    } catch (error) {
      console.error('Failed to add category:', error);
      alert('Failed to add category');
    }
  };

  const handleAddTag = async () => {
    if (!tagForm.name.trim()) {
      alert('Please enter a tag name');
      return;
    }

    try {
      if (window.electronAPI) {
        await window.electronAPI.addTag({
          name: tagForm.name,
          color: tagForm.color,
        });
        await loadData();
        setShowTagModal(false);
        setTagForm({ name: '', color: '#8B5CF6' });
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
      alert('Failed to add tag');
    }
  };

  const handleAddMapping = async () => {
    if (!mappingForm.value.trim() || !mappingForm.categoryId) {
      alert('Please fill in all fields');
      return;
    }

    try {
      if (window.electronAPI) {
        if (mappingForm.type === 'app') {
          await window.electronAPI.addAppCategoryMapping(mappingForm.value, mappingForm.categoryId);
        } else {
          await window.electronAPI.addDomainCategoryMapping(mappingForm.value, mappingForm.categoryId);
        }
        setShowMappingModal(false);
        setMappingForm({ type: 'app', value: '', categoryId: 0 });
        alert('Mapping added successfully');
      }
    } catch (error) {
      console.error('Failed to add mapping:', error);
      alert('Failed to add mapping');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 overflow-y-auto space-y-8">
        <div className="space-y-2">
          <Skeleton width="200px" height="32px" />
          <Skeleton width="300px" height="20px" />
        </div>
        <div className="grid grid-cols-1 gap-6">
          <Skeleton variant="rectangular" height="200px" />
          <Skeleton variant="rectangular" height="200px" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('categories.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('categories.subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'categories'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              {t('categories.categoriesTab')}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'tags'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {t('categories.tagsTab')}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('mappings')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'mappings'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              {t('categories.mappingsTab')}
            </div>
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('categories.manageCategories')}
            </h3>
            <Button variant="primary" icon={Plus} onClick={() => setShowCategoryModal(true)}>
              {t('categories.addCategory')}
            </Button>
          </div>

          {categories.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={t('categories.noCategories')}
              description={t('categories.noCategoriesDesc')}
              action={{
                label: t('categories.addCategory'),
                onClick: () => setShowCategoryModal(true),
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {category.name}
                    </h4>
                  </div>
                  {category.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {category.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tags' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('categories.manageTags')}
            </h3>
            <Button variant="primary" icon={Plus} onClick={() => setShowTagModal(true)}>
              {t('categories.addTag')}
            </Button>
          </div>

          {tags.length === 0 ? (
            <EmptyState
              icon={Tag}
              title={t('categories.noTags')}
              description={t('categories.noTagsDesc')}
              action={{
                label: t('categories.addTag'),
                onClick: () => setShowTagModal(true),
              }}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'mappings' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('categories.manageMappings')}
            </h3>
            <Button variant="primary" icon={Plus} onClick={() => setShowMappingModal(true)}>
              {t('categories.addMapping')}
            </Button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400">
              {t('categories.mappingsDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('categories.addCategory')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Work, Design, Development"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Brief description of this category"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setShowCategoryModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleAddCategory} className="flex-1">
                  Add Category
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('categories.addTag')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={tagForm.name}
                  onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Urgent, Client Work, Learning"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={tagForm.color}
                  onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                  className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setShowTagModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleAddTag} className="flex-1">
                  Add Tag
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Modal */}
      {showMappingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('categories.addMapping')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={mappingForm.type}
                  onChange={(e) => setMappingForm({ ...mappingForm, type: e.target.value as 'app' | 'domain' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="app">Application</option>
                  <option value="domain">Website Domain</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {mappingForm.type === 'app' ? 'Application Name' : 'Domain'}
                </label>
                <input
                  type="text"
                  value={mappingForm.value}
                  onChange={(e) => setMappingForm({ ...mappingForm, value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={mappingForm.type === 'app' ? 'e.g., Visual Studio Code' : 'e.g., github.com'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={mappingForm.categoryId}
                  onChange={(e) => setMappingForm({ ...mappingForm, categoryId: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value={0}>Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setShowMappingModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleAddMapping} className="flex-1">
                  Add Mapping
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
