// lib/validations.ts
import { z } from 'zod';
import { config } from './config';

/**
 * Validation schema for Intro records
 */
export const introSchema = z.object({
  month: z.enum(config.months, {
    message: 'Please select a valid month',
  }),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .transform((str) => (str === '' ? undefined : str))
    .optional()
    .nullable(),
  time: z.string().optional().or(z.literal('')),
  class: z.string().min(1, 'Class is required').max(100, 'Class name too long'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone number too long').optional().or(z.literal('')),
  staff: z.string().min(1, 'Staff member is required').max(100, 'Staff name too long'),
  attended: z.enum(['Yes', 'No']).optional().or(z.literal('')),
  signed_up: z.enum(['Yes', 'No']).optional().or(z.literal('')),
  status: z.enum(['Active', 'Cancelled', 'Completed']).optional().or(z.literal('')),
});

/**
 * Validation schema for Signup records
 */
export const signupSchema = z.object({
  month: z.enum(config.months, {
    message: 'Please select a valid month',
  }),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  membership: z.string().min(1, 'Membership type is required'), // Now dynamic from settings
  membership_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .transform((str) => (str === '' ? undefined : str))
    .optional()
    .nullable(),
  first_payment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .transform((str) => (str === '' ? undefined : str))
    .optional()
    .nullable(),
  signup_package: z.boolean().optional(),
  notes: z.string().max(500, 'Notes too long (max 500 characters)').optional().or(z.literal('')),
});

/**
 * Validation schema for Cancellation records
 */
export const cancellationSchema = z.object({
  month: z.enum(config.months, {
    message: 'Please select a valid month',
  }),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  date: z // Renamed from cancellation_date
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .transform((str) => (str === '' ? undefined : str))
    .optional()
    .nullable(),
  reason: z.string().min(1, 'Reason is required').max(200, 'Reason too long'), // Now dynamic from settings
  age_group: z.string().max(50, 'Age category too long').optional().or(z.literal('')),
  notes: z.string().max(500, 'Notes too long (max 500 characters)').optional().or(z.literal('')),
});

/**
 * Validation schema for Hold records
 */
export const holdSchema = z
  .object({
    month: z.enum(config.months, {
      message: 'Please select a valid month',
    }),
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
    start: z // Renamed from start_date
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
      .transform((str) => (str === '' ? undefined : str))
      .optional()
      .nullable(),
    end: z // Renamed from end_date
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
      .transform((str) => (str === '' ? undefined : str))
      .optional()
      .nullable(),
    reason: z.string().min(1, 'Reason is required').max(200, 'Reason too long'), // Now dynamic from settings
    fee: z.string().max(50, 'Fee too long').optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      // If both dates are provided, ensure end is after start
      if (data.start && data.end && data.start !== '' && data.end !== '') {
        return new Date(data.end) >= new Date(data.start);
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['end'],
    }
  );

/**
 * Validation schema for Follow-up notes
 */
export const followUpNoteSchema = z.object({
  intro_id: z.string().uuid('Invalid intro ID'),
  note: z.string().min(1, 'Note is required').max(1000, 'Note too long (max 1000 characters)'),
  staff_name: z.string().optional().or(z.literal('')),
});

/**
 * Validation schema for Class history
 */
export const classHistorySchema = z.object({
  intro_id: z.string().uuid('Invalid intro ID'),
  month: z.enum(config.months),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .transform((str) => (str === '' ? undefined : str))
    .optional()
    .nullable(),
  time: z.string().optional().or(z.literal('')),
  class: z.string().optional().or(z.literal('')),
  staff: z.string().optional().or(z.literal('')),
  attended: z.enum(['Yes', 'No']).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
});

/**
 * Validation schema for User Profile
 */
export const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  avatar_url: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
});

/**
 * Validation schema for Password Update
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Generic validation function
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with typed data or errors
 */
export const validate = <T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((e: z.ZodIssue) => {
        const path = e.path.join('.');
        return path ? `${path}: ${e.message}` : e.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
};

/**
 * Async validation function for forms
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Promise resolving to validation result
 */
export const validateAsync = async <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<ValidationResult<T>> => {
  try {
    const validated = await schema.parseAsync(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((e: z.ZodIssue) => {
        const path = e.path.join('.');
        return path ? `${path}: ${e.message}` : e.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
};

/**
 * Partial validation - allows partial object validation
 */
export const validatePartial = <T>(
  // biome-ignore lint/suspicious/noExplicitAny: Generic schema validation requires any type
  schema: z.ZodObject<any>,
  data: unknown
): ValidationResult<Partial<T>> => {
  const partialSchema = schema.partial();
  return validate(partialSchema, data) as ValidationResult<Partial<T>>;
};

/**
 * Helper to format validation errors for display
 * @param errors - Array of error messages
 * @returns Formatted error string
 */
export const formatValidationErrors = (errors: string[]): string => {
  if (errors.length === 1) {
    return errors[0] ?? 'Validation error';
  }
  return `Please fix the following errors:\n${errors.map((e) => `• ${e}`).join('\n')}`;
};
