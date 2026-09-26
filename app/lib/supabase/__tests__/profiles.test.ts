import type { UserProfile } from '@/lib/supabase/profiles';
import { createUserProfile, fetchUserProfile, updateUserProfile } from '@/lib/supabase/profiles';

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
    auth: {
      updateUser: jest.fn(),
      admin: {
        deleteUser: jest.fn(),
      },
    },
  },
}));

// Import the mocked client
import { supabase } from '@/lib/supabase/client';

const mockedSupabase = supabase as unknown as { from: jest.Mock };

describe('profiles', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProfile: UserProfile = {
    id: mockUserId,
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    role: 'staff',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchUserProfile', () => {
    it('should fetch user profile successfully', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await fetchUserProfile(mockUserId);

      expect(mockedSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', mockUserId);
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(mockProfile);
    });

    it('should return null when profile not found (PGRST116)', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await fetchUserProfile(mockUserId);

      expect(result).toBeNull();
    });

    it('should throw error when userId is missing', async () => {
      await expect(fetchUserProfile('')).rejects.toThrow();
    });

    it('should throw database error on query failure', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST000', message: 'Database error' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      await expect(fetchUserProfile(mockUserId)).rejects.toThrow();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const updates = { full_name: 'Updated Name' };
      const updatedProfile = { ...mockProfile, ...updates };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: updatedProfile,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await updateUserProfile(mockUserId, updates);

      expect(mockedSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', mockUserId);
      expect(result).toEqual(updatedProfile);
    });

    it('should throw error when userId is missing', async () => {
      await expect(updateUserProfile('', { full_name: 'Test' })).rejects.toThrow();
    });

    it('should throw validation error for empty name', async () => {
      await expect(updateUserProfile(mockUserId, { full_name: '   ' })).rejects.toThrow();
    });

    it('should throw validation error for name too long', async () => {
      const longName = 'a'.repeat(101);
      await expect(updateUserProfile(mockUserId, { full_name: longName })).rejects.toThrow();
    });

    it('should trim whitespace from name', async () => {
      const updates = { full_name: '  Test Name  ' };
      const updatedProfile = { ...mockProfile, full_name: 'Test Name' };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: updatedProfile,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await updateUserProfile(mockUserId, updates);

      expect(result.full_name).toBe('Test Name');
    });

    it('should throw database error on update failure', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      await expect(updateUserProfile(mockUserId, { full_name: 'Test' })).rejects.toThrow();
    });
  });

  describe('createUserProfile', () => {
    it('should create user profile successfully', async () => {
      const profileData = {
        id: mockUserId,
        full_name: 'New User',
      };

      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await createUserProfile(profileData);

      expect(mockedSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockInsert).toHaveBeenCalledWith([profileData]);
      expect(result).toEqual(mockProfile);
    });

    it('should throw error when id is missing', async () => {
      await expect(createUserProfile({ id: '', full_name: 'Test' })).rejects.toThrow();
    });

    it('should throw error when full_name is missing', async () => {
      await expect(createUserProfile({ id: mockUserId, full_name: '' })).rejects.toThrow();
    });

    it('should throw database error on insert failure', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      await expect(createUserProfile({ id: mockUserId, full_name: 'Test' })).rejects.toThrow();
    });
  });
});
