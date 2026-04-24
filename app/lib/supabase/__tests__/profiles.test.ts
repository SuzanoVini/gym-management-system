import type { UserProfile } from '@/lib/supabase/profiles';
import {
  createUserProfile,
  deleteProfileAvatar,
  deleteUserAccount,
  fetchUserProfile,
  updateUserPassword,
  updateUserProfile,
  uploadProfileAvatar,
} from '@/lib/supabase/profiles';

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

      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
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

      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
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

      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
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

  describe('uploadProfileAvatar', () => {
    it('should upload avatar successfully', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const publicUrl = 'https://example.com/avatars/test.jpg';

      // Mock fetchUserProfile
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock update for profile
      const mockUpdate = jest.fn().mockReturnThis();
      const mockSelectUpdate = jest.fn().mockReturnThis();
      const mockSingleUpdate = jest.fn().mockResolvedValue({
        data: { ...mockProfile, avatar_url: publicUrl },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        update: mockUpdate,
      });

      // Mock chained methods for update
      mockUpdate.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: mockSelectUpdate,
        }),
      });

      mockSelectUpdate.mockReturnValue({
        single: mockSingleUpdate,
      });

      // Mock storage upload
      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl },
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });

      const result = await uploadProfileAvatar(mockUserId, mockFile);

      expect(mockUpload).toHaveBeenCalled();
      expect(result).toBe(publicUrl);
    });

    it('should throw error when userId is missing', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await expect(uploadProfileAvatar('', mockFile)).rejects.toThrow();
    });

    it('should throw error when file is missing', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing null file requires any type
      await expect(uploadProfileAvatar(mockUserId, null as any)).rejects.toThrow();
    });

    it('should throw validation error for file too large', async () => {
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });

      await expect(uploadProfileAvatar(mockUserId, largeFile)).rejects.toThrow();
    });

    it('should throw validation error for invalid file type', async () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      await expect(uploadProfileAvatar(mockUserId, invalidFile)).rejects.toThrow();
    });

    it('should throw error on upload failure', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Mock fetchUserProfile
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      // Mock storage upload failure
      const mockUpload = jest.fn().mockResolvedValue({
        error: { message: 'Upload failed' },
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: mockUpload,
      });

      await expect(uploadProfileAvatar(mockUserId, mockFile)).rejects.toThrow();
    });
  });

  describe('deleteProfileAvatar', () => {
    it('should delete avatar successfully', async () => {
      const profileWithAvatar = {
        ...mockProfile,
        avatar_url: 'https://example.com/storage/v1/object/public/avatars/123/test.jpg',
      };

      // Track call counts
      let _selectCallCount = 0;

      // Mock fetchUserProfile - first call returns profile with avatar
      const mockSelect = jest.fn().mockImplementation(() => {
        _selectCallCount++;
        return {
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: profileWithAvatar,
              error: null,
            }),
          }),
        };
      });

      // Mock update for clearing avatar_url
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...profileWithAvatar, avatar_url: null },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      // Mock storage delete
      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      (supabase.storage.from as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      await deleteProfileAvatar(mockUserId);

      expect(mockRemove).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should return early if no avatar exists', async () => {
      // Mock fetchUserProfile returning profile without avatar
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { ...mockProfile, avatar_url: null },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      await deleteProfileAvatar(mockUserId);

      // Should not attempt to delete from storage
      expect(supabase.storage.from).not.toHaveBeenCalled();
    });

    it('should throw error when userId is missing', async () => {
      await expect(deleteProfileAvatar('')).rejects.toThrow();
    });
  });

  describe('updateUserPassword', () => {
    it('should update password successfully', async () => {
      const newPassword = 'NewPass123';

      (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
        error: null,
      });

      const result = await updateUserPassword(newPassword);

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: newPassword,
      });
      expect(result).toBe(true);
    });

    it('should throw validation error for short password', async () => {
      await expect(updateUserPassword('short')).rejects.toThrow();
    });

    it('should throw validation error for password without uppercase', async () => {
      await expect(updateUserPassword('lowercase123')).rejects.toThrow();
    });

    it('should throw validation error for password without lowercase', async () => {
      await expect(updateUserPassword('UPPERCASE123')).rejects.toThrow();
    });

    it('should throw validation error for password without number', async () => {
      await expect(updateUserPassword('NoNumbers')).rejects.toThrow();
    });

    it('should throw error on update failure', async () => {
      const newPassword = 'ValidPass123';

      (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
        error: { message: 'Update failed' },
      });

      await expect(updateUserPassword(newPassword)).rejects.toThrow();
    });
  });

  describe('deleteUserAccount', () => {
    it('should delete user account successfully', async () => {
      // Mock fetchUserProfile
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { ...mockProfile, avatar_url: null },
        error: null,
      });

      // Mock profile deletion
      const mockDelete = jest.fn().mockReturnThis();
      const mockDeleteEq = jest.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        delete: mockDelete,
      });

      mockDelete.mockReturnValue({
        eq: mockDeleteEq,
      });

      // Mock auth deletion
      (supabase.auth.admin.deleteUser as jest.Mock).mockResolvedValue({
        error: null,
      });

      const result = await deleteUserAccount(mockUserId);

      expect(result).toBe(true);
      expect(supabase.auth.admin.deleteUser).toHaveBeenCalledWith(mockUserId);
    });

    it('should throw error when userId is missing', async () => {
      await expect(deleteUserAccount('')).rejects.toThrow();
    });

    it('should throw error on profile deletion failure', async () => {
      // Mock fetchUserProfile
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { ...mockProfile, avatar_url: null },
        error: null,
      });

      // Mock profile deletion failure
      const mockDelete = jest.fn().mockReturnThis();
      const mockDeleteEq = jest.fn().mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        delete: mockDelete,
      });

      mockDelete.mockReturnValue({
        eq: mockDeleteEq,
      });

      await expect(deleteUserAccount(mockUserId)).rejects.toThrow();
    });

    it('should throw error on auth deletion failure', async () => {
      // Mock fetchUserProfile
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { ...mockProfile, avatar_url: null },
        error: null,
      });

      // Mock profile deletion success
      const mockDelete = jest.fn().mockReturnThis();
      const mockDeleteEq = jest.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        delete: mockDelete,
      });

      mockDelete.mockReturnValue({
        eq: mockDeleteEq,
      });

      // Mock auth deletion failure
      (supabase.auth.admin.deleteUser as jest.Mock).mockResolvedValue({
        error: { message: 'Auth delete failed' },
      });

      await expect(deleteUserAccount(mockUserId)).rejects.toThrow();
    });
  });
});
