// Categorization & Tagging Types
export interface Category {
  id?: number;
  name: string;
  color: string; // Hex color
  icon?: string; // Lucide icon name
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tag {
  id?: number;
  name: string;
  color: string; // Hex color
  createdAt?: string;
}

export interface AppCategoryMapping {
  id?: number;
  appName: string;
  categoryId: number;
  categoryName?: string;
  categoryColor?: string;
  createdAt?: string;
}

export interface DomainCategoryMapping {
  id?: number;
  domain: string;
  categoryId: number;
  categoryName?: string;
  categoryColor?: string;
  createdAt?: string;
}

export interface CategoryStats {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  totalTime: number; // in seconds
  percentage: number;
  activityCount: number;
}

export interface TagStats {
  tagId: number;
  tagName: string;
  tagColor: string;
  totalTime: number; // in seconds
  percentage: number;
  activityCount: number;
}
