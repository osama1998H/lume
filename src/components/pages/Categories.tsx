import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Plus, Tag, Link, Trash2, Edit2, Check, X } from 'lucide-react';
import { Category, Tag as TagType, AppCategoryMapping, DomainCategoryMapping } from '../../types';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { FormModal, ConfirmModal } from '../ui/Modal';
import FormField, { SelectField } from '../ui/FormField';
import { showToast } from '../../utils/toast';
import { validateFormData, categorySchema, tagSchema, mappingSchema } from '../../utils/validation';
import { motion, AnimatePresence } from 'framer-motion';

const Categories: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [appMappings, setAppMappings] = useState<AppCategoryMapping[]>([]);
  const [domainMappings, setDomainMappings] = useState<DomainCategoryMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'tags' | 'mappings'>('categories');

  // Inline editing states
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; color: string; description?: string }>({ name: '', color: '' });

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'tag' | 'appMapping' | 'domainMapping'; id: number } | null>(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#3B82F6', description: '' });
  const [tagForm, setTagForm] = useState({ name: '', color: '#8B5CF6' });
  const [mappingForm, setMappingForm] = useState({ type: 'app' as 'app' | 'domain', value: '', categoryId: 0 });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const [categoriesData, tagsData, appMappingsData, domainMappingsData] = await Promise.all([
          window.electronAPI.categories.getAll(),
          window.electronAPI.tags.getAll(),
          window.electronAPI.categoryMappings.apps.getAll(),
          window.electronAPI.categoryMappings.domains.getAll(),
        ]);
        setCategories(categoriesData);
        setTags(tagsData);
        setAppMappings(appMappingsData);
        setDomainMappings(domainMappingsData);
      }
    } catch (error) {
      console.error('Failed to load categories and tags:', error);
      showToast.error(t('categories.loadError') || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Category handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateFormData(categorySchema, categoryForm);

    if (!validation.success) {
      setFormErrors(validation.errors);
      return;
    }

    setIsSaving(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.categories.add(validation.data);
        await loadData();
        setShowCategoryModal(false);
        setCategoryForm({ name: '', color: '#3B82F6', description: '' });
        setFormErrors({});
        showToast.success(t('categories.addSuccess') || 'Category added successfully');
      }
    } catch (error) {
      console.error('Failed to add category:', error);
      showToast.error(t('categories.addError') || 'Failed to add category');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingCategory = (category: Category) => {
    setEditingCategoryId(category.id!);
    setEditForm({ name: category.name, color: category.color, description: category.description || '' });
  };

  const cancelEditingCategory = () => {
    setEditingCategoryId(null);
    setEditForm({ name: '', color: '' });
  };

  const saveEditingCategory = async (categoryId: number) => {
    const validation = validateFormData(categorySchema, editForm);

    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0];
      showToast.error(firstError || 'Validation failed');
      return;
    }

    try {
      if (window.electronAPI) {
        await window.electronAPI.categories.update(categoryId, validation.data);
        await loadData();
        setEditingCategoryId(null);
        setEditForm({ name: '', color: '' });
        showToast.success(t('categories.updateSuccess') || 'Category updated successfully');
      }
    } catch (error) {
      console.error('Failed to update category:', error);
      showToast.error(t('categories.updateError') || 'Failed to update category');
    }
  };

  // Tag handlers
  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateFormData(tagSchema, tagForm);

    if (!validation.success) {
      setFormErrors(validation.errors);
      return;
    }

    setIsSaving(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.tags.add(validation.data);
        await loadData();
        setShowTagModal(false);
        setTagForm({ name: '', color: '#8B5CF6' });
        setFormErrors({});
        showToast.success(t('categories.tagAddSuccess') || 'Tag added successfully');
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
      showToast.error(t('categories.tagAddError') || 'Failed to add tag');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingTag = (tag: TagType) => {
    setEditingTagId(tag.id!);
    setEditForm({ name: tag.name, color: tag.color });
  };

  const cancelEditingTag = () => {
    setEditingTagId(null);
    setEditForm({ name: '', color: '' });
  };

  const saveEditingTag = async (tagId: number) => {
    const validation = validateFormData(tagSchema, editForm);

    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0];
      showToast.error(firstError || 'Validation failed');
      return;
    }

    try {
      if (window.electronAPI) {
        await window.electronAPI.tags.update(tagId, validation.data);
        await loadData();
        setEditingTagId(null);
        setEditForm({ name: '', color: '' });
        showToast.success(t('categories.tagUpdateSuccess') || 'Tag updated successfully');
      }
    } catch (error) {
      console.error('Failed to update tag:', error);
      showToast.error(t('categories.tagUpdateError') || 'Failed to update tag');
    }
  };

  // Mapping handlers
  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateFormData(mappingSchema, mappingForm);

    if (!validation.success) {
      setFormErrors(validation.errors);
      return;
    }

    setIsSaving(true);
    try {
      if (window.electronAPI) {
        if (mappingForm.type === 'app') {
          await window.electronAPI.categoryMappings.apps.add(mappingForm.value, mappingForm.categoryId);
        } else {
          await window.electronAPI.categoryMappings.domains.add(mappingForm.value, mappingForm.categoryId);
        }
        await loadData();
        setShowMappingModal(false);
        setMappingForm({ type: 'app', value: '', categoryId: 0 });
        setFormErrors({});
        showToast.success(t('categories.mappingAddSuccess') || 'Mapping added successfully');
      }
    } catch (error) {
      console.error('Failed to add mapping:', error);
      showToast.error(t('categories.mappingAddError') || 'Failed to add mapping');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete handlers
  const handleDelete = (type: 'category' | 'tag' | 'appMapping' | 'domainMapping', id: number) => {
    setDeleteTarget({ type, id });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setIsSaving(true);
    try {
      if (window.electronAPI) {
        switch (deleteTarget.type) {
          case 'category':
            await window.electronAPI.categories.delete(deleteTarget.id);
            showToast.success(t('categories.deleteSuccess') || 'Category deleted successfully');
            break;
          case 'tag':
            await window.electronAPI.tags.delete(deleteTarget.id);
            showToast.success(t('categories.tagDeleteSuccess') || 'Tag deleted successfully');
            break;
          case 'appMapping':
            await window.electronAPI.categoryMappings.apps.delete(deleteTarget.id);
            showToast.success(t('categories.mappingDeleteSuccess') || 'Mapping deleted successfully');
            break;
          case 'domainMapping':
            await window.electronAPI.categoryMappings.domains.delete(deleteTarget.id);
            showToast.success(t('categories.mappingDeleteSuccess') || 'Mapping deleted successfully');
            break;
        }
        await loadData();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      showToast.error(t('categories.deleteError') || 'Failed to delete');
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
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
    <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('categories.title')}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {t('categories.subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <nav
        className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-6 overflow-x-auto"
        role="tablist"
        aria-label={t('categories.tabsLabel', 'Categories sections')}
      >
        <button
          onClick={() => setActiveTab('categories')}
          role="tab"
          aria-selected={activeTab === 'categories'}
          aria-controls="categories-tab-panel"
          tabIndex={activeTab === 'categories' ? 0 : -1}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all flex-1 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            activeTab === 'categories'
              ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <FolderOpen className="w-4 h-4" aria-hidden="true" />
          <span className="text-sm font-medium">{t('categories.categoriesTab')}</span>
        </button>
        <button
          onClick={() => setActiveTab('tags')}
          role="tab"
          aria-selected={activeTab === 'tags'}
          aria-controls="tags-tab-panel"
          tabIndex={activeTab === 'tags' ? 0 : -1}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all flex-1 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            activeTab === 'tags'
              ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Tag className="w-4 h-4" aria-hidden="true" />
          <span className="text-sm font-medium">{t('categories.tagsTab')}</span>
        </button>
        <button
          onClick={() => setActiveTab('mappings')}
          role="tab"
          aria-selected={activeTab === 'mappings'}
          aria-controls="mappings-tab-panel"
          tabIndex={activeTab === 'mappings' ? 0 : -1}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all flex-1 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            activeTab === 'mappings'
              ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Link className="w-4 h-4" aria-hidden="true" />
          <span className="text-sm font-medium">{t('categories.mappingsTab')}</span>
        </button>
      </nav>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {categories.map((category) => (
                  <motion.div
                    key={category.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700 group"
                  >
                    {editingCategoryId === category.id ? (
                      // Edit mode
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editForm.color}
                            onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                            title="Choose color"
                          />
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditingCategory(category.id!);
                              if (e.key === 'Escape') cancelEditingCategory();
                            }}
                            className="flex-1 px-2 py-1 text-sm font-semibold border-b-2 border-primary-500 bg-transparent focus:outline-none text-gray-900 dark:text-white"
                            autoFocus
                          />
                        </div>
                        <textarea
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder={t('categories.descriptionOptional')}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEditingCategory(category.id!)}
                            className="flex-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                          >
                            <Check className="h-3 w-3" /> {t('categories.save')}
                          </button>
                          <button
                            onClick={cancelEditingCategory}
                            className="flex-1 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                          >
                            <X className="h-3 w-3" /> {t('categories.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-5 h-5 rounded-full ring-2 ring-white dark:ring-gray-800 shadow-sm"
                            style={{ backgroundColor: category.color }}
                          />
                          <h4 className="font-semibold text-gray-900 dark:text-white flex-1">
                            {category.name}
                          </h4>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditingCategory(category)}
                              className="p-1.5 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                              title={t('categories.editCategory')}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete('category', category.id!)}
                              className="p-1.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                              title={t('categories.deleteCategory')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {category.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {category.description}
                          </p>
                        )}
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
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
            <div className="flex flex-wrap gap-3">
              <AnimatePresence mode="popLayout">
                {tags.map((tag) => (
                  <motion.div
                    key={tag.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="group relative"
                  >
                    {editingTagId === tag.id ? (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 shadow-lg border-2 border-primary-500">
                        <input
                          type="color"
                          value={editForm.color}
                          onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                          className="w-6 h-6 rounded-full cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditingTag(tag.id!);
                            if (e.key === 'Escape') cancelEditingTag();
                          }}
                          className="w-24 px-1 text-sm font-medium bg-transparent border-b border-gray-400 focus:outline-none text-gray-900 dark:text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => saveEditingTag(tag.id!)}
                          className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          onClick={cancelEditingTag}
                          className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="px-4 py-2 rounded-full text-sm font-medium text-white cursor-pointer flex items-center gap-2 hover:scale-105 transition-transform"
                        style={{ backgroundColor: tag.color }}
                        onClick={() => startEditingTag(tag)}
                        title={t('categories.clickToEdit')}
                      >
                        {tag.name}
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingTag(tag);
                            }}
                            className="p-0.5 hover:bg-white/20 rounded"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete('tag', tag.id!);
                            }}
                            className="p-0.5 hover:bg-white/20 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Mappings Tab - Keeping the existing table structure but with better delete handling */}
      {activeTab === 'mappings' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              {t('categories.manageMappings')}
            </h3>
            <Button variant="primary" icon={Plus} onClick={() => setShowMappingModal(true)}>
              {t('categories.addMapping')}
            </Button>
          </div>

          {/* App Mappings Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                {t('categories.applicationMappings')}
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('categories.applicationMappingsDesc')}
              </p>
            </div>
            <div className="overflow-x-auto">
              {appMappings.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                  {t('categories.noApplicationMappings')}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('categories.application')}
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('categories.category')}
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('categories.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {appMappings.map((mapping) => (
                      <tr key={mapping.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {mapping.appName}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            {mapping.categoryColor && (
                              <div
                                className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600"
                                style={{ backgroundColor: mapping.categoryColor }}
                              />
                            )}
                            <span>{mapping.categoryName || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => mapping.id && handleDelete('appMapping', mapping.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                            title={t('categories.deleteMapping')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Domain Mappings Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                {t('categories.domainMappings')}
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('categories.domainMappingsDesc')}
              </p>
            </div>
            <div className="overflow-x-auto">
              {domainMappings.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                  {t('categories.noDomainMappings')}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('categories.domain')}
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('categories.category')}
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('categories.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {domainMappings.map((mapping) => (
                      <tr key={mapping.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {mapping.domain}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            {mapping.categoryColor && (
                              <div
                                className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600"
                                style={{ backgroundColor: mapping.categoryColor }}
                              />
                            )}
                            <span>{mapping.categoryName || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => mapping.id && handleDelete('domainMapping', mapping.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                            title={t('categories.deleteMapping')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      <FormModal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setFormErrors({});
        }}
        onSubmit={handleAddCategory}
        title={t('categories.addCategory')}
        isLoading={isSaving}
        size="md"
      >
        <div className="space-y-4">
          <FormField
            label={t('categories.categoryName') || 'Category Name'}
            name="name"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            error={formErrors.name}
            required
            placeholder="e.g., Work, Design, Development"
          />
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t('categories.color') || 'Color'} *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={categoryForm.color}
                onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                className="w-16 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={categoryForm.color}
                onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white uppercase"
                placeholder="#3B82F6"
                maxLength={7}
              />
            </div>
            {formErrors.color && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.color}</p>
            )}
          </div>
          <FormField
            as="textarea"
            label={t('categories.description') || 'Description'}
            name="description"
            value={categoryForm.description}
            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
            error={formErrors.description}
            placeholder="Brief description of this category"
            rows={3}
          />
        </div>
      </FormModal>

      {/* Add Tag Modal */}
      <FormModal
        isOpen={showTagModal}
        onClose={() => {
          setShowTagModal(false);
          setFormErrors({});
        }}
        onSubmit={handleAddTag}
        title={t('categories.addTag')}
        isLoading={isSaving}
        size="sm"
      >
        <div className="space-y-4">
          <FormField
            label={t('categories.tagName') || 'Tag Name'}
            name="name"
            value={tagForm.name}
            onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
            error={formErrors.name}
            required
            placeholder="e.g., Urgent, Client Work, Learning"
          />
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t('categories.color') || 'Color'} *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={tagForm.color}
                onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                className="w-16 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={tagForm.color}
                onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white uppercase"
                placeholder="#8B5CF6"
                maxLength={7}
              />
            </div>
            {formErrors.color && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.color}</p>
            )}
          </div>
        </div>
      </FormModal>

      {/* Add Mapping Modal */}
      <FormModal
        isOpen={showMappingModal}
        onClose={() => {
          setShowMappingModal(false);
          setFormErrors({});
        }}
        onSubmit={handleAddMapping}
        title={t('categories.addMapping')}
        isLoading={isSaving}
        size="md"
      >
        <div className="space-y-4">
          <SelectField
            label={t('categories.mappingType') || 'Type'}
            name="type"
            value={mappingForm.type}
            onChange={(e) => setMappingForm({ ...mappingForm, type: e.target.value as 'app' | 'domain' })}
            options={[
              { value: 'app', label: t('categories.mappingTypeApplication') },
              { value: 'domain', label: t('categories.mappingTypeWebsiteDomain') },
            ]}
            required
          />
          <FormField
            label={mappingForm.type === 'app' ? t('categories.applicationName') : t('categories.domain')}
            name="value"
            value={mappingForm.value}
            onChange={(e) => setMappingForm({ ...mappingForm, value: e.target.value })}
            error={formErrors.value}
            required
            placeholder={mappingForm.type === 'app' ? 'e.g., Visual Studio Code' : 'e.g., github.com'}
          />
          <SelectField
            label={t('categories.category') || 'Category'}
            name="categoryId"
            value={mappingForm.categoryId.toString()}
            onChange={(e) => setMappingForm({ ...mappingForm, categoryId: Number(e.target.value) })}
            error={formErrors.categoryId}
            options={[
              { value: '0', label: t('categories.selectCategory') },
              ...categories.map((cat) => ({ value: cat.id!.toString(), label: cat.name })),
            ]}
            required
          />
        </div>
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title={t('common.confirmDelete') || 'Confirm Delete'}
        message={
          deleteTarget?.type === 'category'
            ? t('categories.confirmDeleteCategory') || 'Are you sure you want to delete this category? This action cannot be undone.'
            : deleteTarget?.type === 'tag'
            ? t('categories.confirmDeleteTag') || 'Are you sure you want to delete this tag? This action cannot be undone.'
            : t('categories.confirmDeleteMapping') || 'Are you sure you want to delete this mapping? This action cannot be undone.'
        }
        confirmText={t('common.delete') || 'Delete'}
        cancelText={t('common.cancel') || 'Cancel'}
        variant="danger"
        isLoading={isSaving}
      />
    </div>
  );
};

export default Categories;
