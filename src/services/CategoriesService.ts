import { DatabaseManager } from '../database/DatabaseManager';
import {
  Category,
  Tag,
  AppCategoryMapping,
  DomainCategoryMapping,
  CategoryStats,
  TagStats,
} from '../types';

export class CategoriesService {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  // ==================== CATEGORIES ====================

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    try {
      return await this.db.getCategories();
    } catch (error) {
      console.error('Failed to get categories:', error);
      throw error;
    }
  }

  /**
   * Get a category by ID
   */
  async getCategoryById(id: number): Promise<Category | null> {
    try {
      return await this.db.getCategoryById(id);
    } catch (error) {
      console.error('Failed to get category by ID:', error);
      throw error;
    }
  }

  /**
   * Add a new category
   */
  async addCategory(category: Category): Promise<number> {
    try {
      const id = await this.db.addCategory(category);
      console.log(`✅ Category created: ${category.name} (ID: ${id})`);
      return id;
    } catch (error) {
      console.error('Failed to add category:', error);
      throw error;
    }
  }

  /**
   * Update an existing category
   */
  async updateCategory(id: number, updates: Partial<Category>): Promise<boolean> {
    try {
      const success = await this.db.updateCategory(id, updates);
      if (success) {
        console.log(`✅ Category updated (ID: ${id})`);
      }
      return success;
    } catch (error) {
      console.error('Failed to update category:', error);
      throw error;
    }
  }

  /**
   * Delete a category (will cascade to mappings)
   */
  async deleteCategory(id: number): Promise<boolean> {
    try {
      const success = await this.db.deleteCategory(id);
      if (success) {
        console.log(`✅ Category deleted (ID: ${id})`);
      }
      return success;
    } catch (error) {
      console.error('Failed to delete category:', error);
      throw error;
    }
  }

  // ==================== TAGS ====================

  /**
   * Get all tags
   */
  async getTags(): Promise<Tag[]> {
    try {
      return await this.db.getTags();
    } catch (error) {
      console.error('Failed to get tags:', error);
      throw error;
    }
  }

  /**
   * Add a new tag
   */
  async addTag(tag: Tag): Promise<number> {
    try {
      const id = await this.db.addTag(tag);
      console.log(`✅ Tag created: ${tag.name} (ID: ${id})`);
      return id;
    } catch (error) {
      console.error('Failed to add tag:', error);
      throw error;
    }
  }

  /**
   * Update an existing tag
   */
  async updateTag(id: number, updates: Partial<Tag>): Promise<boolean> {
    try {
      const success = await this.db.updateTag(id, updates);
      if (success) {
        console.log(`✅ Tag updated (ID: ${id})`);
      }
      return success;
    } catch (error) {
      console.error('Failed to update tag:', error);
      throw error;
    }
  }

  /**
   * Delete a tag (will cascade to associations)
   */
  async deleteTag(id: number): Promise<boolean> {
    try {
      const success = await this.db.deleteTag(id);
      if (success) {
        console.log(`✅ Tag deleted (ID: ${id})`);
      }
      return success;
    } catch (error) {
      console.error('Failed to delete tag:', error);
      throw error;
    }
  }

  // ==================== APP CATEGORY MAPPINGS ====================

  /**
   * Get all app category mappings
   */
  async getAppCategoryMappings(): Promise<AppCategoryMapping[]> {
    try {
      return await this.db.getAppCategoryMappings();
    } catch (error) {
      console.error('Failed to get app category mappings:', error);
      throw error;
    }
  }

  /**
   * Add an app to category mapping
   */
  async addAppCategoryMapping(appName: string, categoryId: number): Promise<number> {
    try {
      const id = await this.db.addAppCategoryMapping(appName, categoryId);
      console.log(`✅ App category mapping created: ${appName} → Category ${categoryId}`);
      return id;
    } catch (error) {
      console.error('Failed to add app category mapping:', error);
      throw error;
    }
  }

  /**
   * Delete an app category mapping
   */
  async deleteAppCategoryMapping(id: number): Promise<boolean> {
    try {
      const success = await this.db.deleteAppCategoryMapping(id);
      if (success) {
        console.log(`✅ App category mapping deleted (ID: ${id})`);
      }
      return success;
    } catch (error) {
      console.error('Failed to delete app category mapping:', error);
      throw error;
    }
  }

  /**
   * Get category ID for a specific app
   */
  async getCategoryIdForApp(appName: string): Promise<number | null> {
    try {
      return await this.db.getCategoryIdForApp(appName);
    } catch (error) {
      console.error('Failed to get category ID for app:', error);
      return null;
    }
  }

  // ==================== DOMAIN CATEGORY MAPPINGS ====================

  /**
   * Get all domain category mappings
   */
  async getDomainCategoryMappings(): Promise<DomainCategoryMapping[]> {
    try {
      return await this.db.getDomainCategoryMappings();
    } catch (error) {
      console.error('Failed to get domain category mappings:', error);
      throw error;
    }
  }

  /**
   * Add a domain to category mapping
   */
  async addDomainCategoryMapping(domain: string, categoryId: number): Promise<number> {
    try {
      const id = await this.db.addDomainCategoryMapping(domain, categoryId);
      console.log(`✅ Domain category mapping created: ${domain} → Category ${categoryId}`);
      return id;
    } catch (error) {
      console.error('Failed to add domain category mapping:', error);
      throw error;
    }
  }

  /**
   * Delete a domain category mapping
   */
  async deleteDomainCategoryMapping(id: number): Promise<boolean> {
    try {
      const success = await this.db.deleteDomainCategoryMapping(id);
      if (success) {
        console.log(`✅ Domain category mapping deleted (ID: ${id})`);
      }
      return success;
    } catch (error) {
      console.error('Failed to delete domain category mapping:', error);
      throw error;
    }
  }

  /**
   * Get category ID for a specific domain
   */
  async getCategoryIdForDomain(domain: string): Promise<number | null> {
    try {
      return await this.db.getCategoryIdForDomain(domain);
    } catch (error) {
      console.error('Failed to get category ID for domain:', error);
      return null;
    }
  }

  // ==================== TAG ASSOCIATIONS ====================

  /**
   * Add tags to a time entry
   */
  async addTimeEntryTags(timeEntryId: number, tagIds: number[]): Promise<void> {
    try {
      await this.db.addTimeEntryTags(timeEntryId, tagIds);
      console.log(`✅ Tags added to time entry ${timeEntryId}: ${tagIds.join(', ')}`);
    } catch (error) {
      console.error('Failed to add tags to time entry:', error);
      throw error;
    }
  }

  /**
   * Get tags for a time entry
   */
  async getTimeEntryTags(timeEntryId: number): Promise<Tag[]> {
    try {
      return await this.db.getTimeEntryTags(timeEntryId);
    } catch (error) {
      console.error('Failed to get time entry tags:', error);
      throw error;
    }
  }

  /**
   * Add tags to an app usage entry
   */
  async addAppUsageTags(appUsageId: number, tagIds: number[]): Promise<void> {
    try {
      await this.db.addAppUsageTags(appUsageId, tagIds);
      console.log(`✅ Tags added to app usage ${appUsageId}: ${tagIds.join(', ')}`);
    } catch (error) {
      console.error('Failed to add tags to app usage:', error);
      throw error;
    }
  }

  /**
   * Get tags for an app usage entry
   */
  async getAppUsageTags(appUsageId: number): Promise<Tag[]> {
    try {
      return await this.db.getAppUsageTags(appUsageId);
    } catch (error) {
      console.error('Failed to get app usage tags:', error);
      throw error;
    }
  }

  // ==================== AUTO-CATEGORIZATION ====================

  /**
   * Auto-assign category to an app based on mappings
   * Returns the category ID if a mapping exists, null otherwise
   */
  async autoCategorizeApp(appName: string): Promise<number | null> {
    try {
      const categoryId = await this.getCategoryIdForApp(appName);
      if (categoryId) {
        console.log(`🏷️ Auto-categorized app "${appName}" → Category ${categoryId}`);
      }
      return categoryId;
    } catch (error) {
      console.error('Failed to auto-categorize app:', error);
      return null;
    }
  }

  /**
   * Auto-assign category to a domain based on mappings
   * Returns the category ID if a mapping exists, null otherwise
   */
  async autoCategorizeDomain(domain: string): Promise<number | null> {
    try {
      const categoryId = await this.getCategoryIdForDomain(domain);
      if (categoryId) {
        console.log(`🏷️ Auto-categorized domain "${domain}" → Category ${categoryId}`);
      }
      return categoryId;
    } catch (error) {
      console.error('Failed to auto-categorize domain:', error);
      return null;
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Get category statistics for a date range
   */
  async getCategoryStats(_startDate?: string, _endDate?: string): Promise<CategoryStats[]> {
    // This will be implemented in the next version with proper aggregation queries
    console.warn('getCategoryStats: Not yet implemented');
    return [];
  }

  /**
   * Get tag statistics for a date range
   */
  async getTagStats(_startDate?: string, _endDate?: string): Promise<TagStats[]> {
    // This will be implemented in the next version with proper aggregation queries
    console.warn('getTagStats: Not yet implemented');
    return [];
  }

  /**
   * Initialize default categories for new users
   */
  async initializeDefaultCategories(): Promise<void> {
    try {
      const existingCategories = await this.getCategories();
      if (existingCategories.length > 0) {
        console.log('📁 Categories already exist, skipping initialization');
        return;
      }

      const defaultCategories: Category[] = [
        { name: 'Work', color: '#3B82F6', icon: 'Briefcase', description: 'Work-related activities' },
        { name: 'Development', color: '#8B5CF6', icon: 'Code', description: 'Programming and development' },
        { name: 'Communication', color: '#10B981', icon: 'MessageSquare', description: 'Email, chat, meetings' },
        { name: 'Design', color: '#F59E0B', icon: 'Edit2', description: 'Design and creative work' },
        { name: 'Learning', color: '#EF4444', icon: 'BookOpen', description: 'Educational activities' },
        { name: 'Entertainment', color: '#EC4899', icon: 'Tv', description: 'Leisure and entertainment' },
        { name: 'Social Media', color: '#06B6D4', icon: 'Share2', description: 'Social networking' },
        { name: 'Other', color: '#6B7280', icon: 'MoreHorizontal', description: 'Uncategorized activities' },
      ];

      for (const category of defaultCategories) {
        await this.addCategory(category);
      }

      console.log('✅ Default categories initialized');
    } catch (error) {
      console.error('Failed to initialize default categories:', error);
    }
  }
}
