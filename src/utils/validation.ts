import { z } from 'zod';

/**
 * Validation utilities and schemas
 */

// Common validation schemas
export const schemas = {
  // Required string with min length
  requiredString: (minLength = 1, message = 'This field is required') =>
    z.string().min(minLength, message),

  // Optional string
  optionalString: z.string().optional(),

  // Color hex code
  colorHex: z.string().regex(/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color code'),

  // Email
  email: z.string().email('Please enter a valid email address'),

  // Number with optional min/max
  number: (min?: number, max?: number) => {
    let schema = z.number();
    if (min !== undefined) schema = schema.min(min, `Must be at least ${min}`);
    if (max !== undefined) schema = schema.max(max, `Must be at most ${max}`);
    return schema;
  },

  // Positive integer
  positiveInteger: z.number().int().positive('Must be a positive number'),
};

// Category validation schema
export const categorySchema = z.object({
  name: schemas.requiredString(1, 'Category name is required'),
  color: schemas.colorHex,
  description: schemas.optionalString,
});

export type CategoryFormData = z.infer<typeof categorySchema>;

// Tag validation schema
export const tagSchema = z.object({
  name: schemas.requiredString(1, 'Tag name is required'),
  color: schemas.colorHex,
});

export type TagFormData = z.infer<typeof tagSchema>;

// Mapping validation schema
export const mappingSchema = z.object({
  type: z.enum(['app', 'domain']),
  value: schemas.requiredString(1, 'Application or domain name is required'),
  categoryId: schemas.positiveInteger,
});

export type MappingFormData = z.infer<typeof mappingSchema>;

// Goal validation schema
export const goalSchema = z.object({
  name: schemas.requiredString(1, 'Goal name is required'),
  description: schemas.optionalString,
  goalType: z.enum(['daily_time', 'weekly_time', 'category', 'app_limit']),
  category: schemas.optionalString,
  appName: schemas.optionalString,
  targetMinutes: schemas.positiveInteger,
  operator: z.enum(['gte', 'lte', 'eq']),
  period: z.enum(['daily', 'weekly', 'monthly']),
  active: z.boolean(),
  notificationsEnabled: z.boolean(),
  notifyAtPercentage: z.number().min(0).max(100),
});

export type GoalFormData = z.infer<typeof goalSchema>;

/**
 * Helper to format Zod errors for form display
 */
export const formatZodErrors = (error: z.ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};
  error.issues.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  return errors;
};

/**
 * Helper to validate form data
 */
export const validateFormData = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } => {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: formatZodErrors(error) };
    }
    return { success: false, errors: { _form: 'Validation failed' } };
  }
};
