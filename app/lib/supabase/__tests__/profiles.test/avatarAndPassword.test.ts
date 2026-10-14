import type { UserProfile } from '@/lib/supabase/profiles';
import {
  deleteProfileAvatar,
  updateUserPassword,
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

const mockedSupabase = supabase as unknown as {
  storage: { from: jest.Mock };
  auth: { updateUser: jest.Mock };
};

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
      await expect(uploadProfileAvatar(mockUserId, null as unknown as File)).rejects.toThrow();
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
      expect(mockedSupabase.storage.from).not.toHaveBeenCalled();
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

      expect(mockedSupabase.auth.updateUser).toHaveBeenCalledWith({
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
});
