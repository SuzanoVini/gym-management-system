import { introSchema, validate } from '@/lib/validations';

describe('Validation', () => {
  describe('validate function', () => {
    it('should validate valid intro data', () => {
      const validData = {
        month: 'Jan',
        date: 15,
        name: 'John Doe',
        class: 'GB1',
        staff: 'Staff 1',
        email: 'john@example.com',
        phone: '555-123-4567',
        attended: 'Yes',
        signed_up: 'No',
        status: 'Active',
      };

      const result = validate(introSchema, validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject invalid intro data', () => {
      const invalidData = {
        month: 'Invalid',
        date: 32,
        name: '',
        class: '',
        staff: '',
        email: 'invalid-email',
        phone: '',
        attended: 'Invalid',
        signed_up: 'Invalid',
        status: 'Invalid',
      };

      const result = validate(introSchema, invalidData);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should handle missing required fields', () => {
      const incompleteData = {
        month: 'Jan',
        date: 15,
      };

      const result = validate(introSchema, incompleteData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('name: Name is required');
      expect(result.errors).toContain('class: Class is required');
      expect(result.errors).toContain('staff: Staff member is required');
    });

    it('should validate email format', () => {
      const dataWithInvalidEmail = {
        month: 'Jan',
        date: 15,
        name: 'John Doe',
        class: 'GB1',
        staff: 'Staff 1',
        email: 'invalid-email-format',
      };

      const result = validate(introSchema, dataWithInvalidEmail);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('email: Invalid email address');
    });

    it('should validate date range', () => {
      const dataWithInvalidDate = {
        month: 'Jan',
        date: 32,
        name: 'John Doe',
        class: 'GB1',
        staff: 'Staff 1',
      };

      const result = validate(introSchema, dataWithInvalidDate);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('date: Date must be between 1 and 31');
    });
  });
});
