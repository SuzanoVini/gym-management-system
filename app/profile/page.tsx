'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ArrowLeft, Camera, Loader2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import ProtectedRoute from '@/components/providers/ProtectedRoute';
import Modal from '@/components/ui/Modal';
import { errorHandler } from '@/lib/errorHandler';
import { passwordSchema, profileSchema } from '@/lib/validations';

interface ProfileFormData {
  full_name: string;
  avatar_url: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex form handlers with multiple validations and state updates
export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState<ProfileFormData>({
    full_name: '',
    avatar_url: '',
  });
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState({
    profile: false,
    password: false,
    delete: false,
    initial: true,
  });
  const [errors, setErrors] = useState<{
    profile: Record<string, string>;
    password: Record<string, string>;
  }>({
    profile: {},
    password: {},
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    text: string;
    color: string;
  }>({ score: 0, text: '', color: '' });

  const loadUserProfile = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, initial: true }));
      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfileData({
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || '',
        });
        setPreviewUrl(data.avatar_url || '');
      }
    } catch (err) {
      errorHandler.handle(err, 'loadUserProfile');
    } finally {
      setLoading((prev) => ({ ...prev, initial: false }));
    }
  }, [user?.id, supabase.from]);

  const calculatePasswordStrength = useCallback((password: string) => {
    let score = 0;
    if (password.length >= 8) {
      score++;
    }
    if (password.length >= 12) {
      score++;
    }
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
      score++;
    }
    if (/\d/.test(password)) {
      score++;
    }
    if (/[^a-zA-Z0-9]/.test(password)) {
      score++;
    }

    const strengthMap = [
      { score: 0, text: '', color: '' },
      { score: 1, text: 'Very Weak', color: 'bg-red-500' },
      { score: 2, text: 'Weak', color: 'bg-orange-500' },
      { score: 3, text: 'Fair', color: 'bg-yellow-500' },
      { score: 4, text: 'Good', color: 'bg-blue-500' },
      { score: 5, text: 'Strong', color: 'bg-green-500' },
    ];

    setPasswordStrength(strengthMap[score] ?? { score: 0, text: 'Weak', color: 'bg-red-500' });
  }, []);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  useEffect(() => {
    if (passwordData.newPassword) {
      calculatePasswordStrength(passwordData.newPassword);
    } else {
      setPasswordStrength({ score: 0, text: '', color: '' });
    }
  }, [passwordData.newPassword, calculatePasswordStrength]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!validTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        profile: { avatar: 'Please select a valid image file (JPG, PNG, or WebP)' },
      }));
      return;
    }

    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        profile: { avatar: 'File size must be less than 2MB' },
      }));
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setErrors((prev) => ({ ...prev, profile: { ...prev.profile, avatar: '' } }));
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!selectedFile || !user) {
      return null;
    }

    const fileExt = selectedFile.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, selectedFile, { upsert: true });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath);

    return publicUrl;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, profile: true }));
      setErrors((prev) => ({ ...prev, profile: {} }));

      let avatarUrl = profileData.avatar_url;

      if (selectedFile) {
        avatarUrl = (await uploadAvatar()) || avatarUrl;
      }

      const validationData = {
        full_name: profileData.full_name,
        avatar_url: avatarUrl || '',
      };

      const result = profileSchema.safeParse(validationData);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors((prev) => ({ ...prev, profile: fieldErrors }));
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          full_name: profileData.full_name,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setProfileData((prev) => ({ ...prev, avatar_url: avatarUrl }));
      setSelectedFile(null);
      errorHandler.notify('Profile updated successfully', 'success');
    } catch (err) {
      errorHandler.handle(err, 'updateProfile');
    } finally {
      setLoading((prev) => ({ ...prev, profile: false }));
    }
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Password validation requires complex logic
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, password: true }));
      setErrors((prev) => ({ ...prev, password: {} }));

      const fieldErrors: Record<string, string> = {};

      if (!passwordData.currentPassword) {
        fieldErrors.currentPassword = 'Current password is required';
      }

      if (passwordData.newPassword) {
        const result = passwordSchema.safeParse(passwordData.newPassword);
        if (!result.success) {
          fieldErrors.newPassword = result.error.issues[0]?.message || 'Invalid password';
        }
      } else {
        fieldErrors.newPassword = 'New password is required';
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        fieldErrors.confirmPassword = 'Passwords do not match';
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, password: fieldErrors }));
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) {
        throw error;
      }

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      errorHandler.notify('Password updated successfully', 'success');
    } catch (err) {
      errorHandler.handle(err, 'updatePassword');
    } finally {
      setLoading((prev) => ({ ...prev, password: false }));
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== 'DELETE') {
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, delete: true }));

      const response = await fetch('/api/profile/delete', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      errorHandler.notify('Account deleted successfully', 'success');

      // The API route signs the user out, so just redirect
      router.push('/login');
    } catch (err) {
      errorHandler.handle(err, 'deleteAccount');
      setLoading((prev) => ({ ...prev, delete: false }));
    }
  };

  const openDeleteModal = () => {
    setDeleteModalOpen(true);
  };

  const confirmFirstStep = () => {
    setDeleteModalOpen(false);
    setConfirmDeleteModalOpen(true);
  };

  if (loading.initial) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

          {/* Profile Information Section */}
          <div className="section-container mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>

            <form onSubmit={handleProfileSubmit}>
              <div className="flex flex-col sm:flex-row gap-6 mb-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                      {previewUrl ? (
                        // biome-ignore lint/performance/noImgElement: Avatar preview needs dynamic src from file upload
                        <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
                      aria-label="Upload avatar"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    JPG, PNG or WebP (max 2MB)
                  </p>
                  {errors.profile.avatar && (
                    <p className="text-xs text-red-600 mt-1">{errors.profile.avatar}</p>
                  )}
                </div>

                {/* Form Fields */}
                <div className="flex-1 space-y-4">
                  <div>
                    <label htmlFor="full_name" className="form-label">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="full_name"
                      type="text"
                      value={profileData.full_name}
                      onChange={(e) =>
                        setProfileData((prev) => ({ ...prev, full_name: e.target.value }))
                      }
                      className={`form-input ${errors.profile.full_name ? '!border-red-300' : ''}`}
                      placeholder="Enter your full name"
                      required
                    />
                    {errors.profile.full_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.profile.full_name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="form-label">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      className="form-input !bg-gray-100 !cursor-not-allowed"
                      disabled
                      readOnly
                    />
                    <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading.profile}
                  className="btn btn-primary min-w-[120px]"
                >
                  {loading.profile ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save Profile'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Password Change Section */}
          <div className="section-container mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Change Password</h2>

            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="currentPassword" className="form-label">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
                    }
                    className={`form-input ${errors.password.currentPassword ? '!border-red-300' : ''}`}
                    placeholder="Enter current password"
                    required
                  />
                  {errors.password.currentPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.currentPassword}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="newPassword" className="form-label">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    className={`form-input ${errors.password.newPassword ? '!border-red-300' : ''}`}
                    placeholder="Enter new password"
                    required
                  />
                  {errors.password.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.newPassword}</p>
                  )}

                  {/* Password Strength Indicator */}
                  {passwordData.newPassword && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 min-w-[80px]">
                          {passwordStrength.text}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Password Requirements */}
                  <div className="mt-3 text-xs text-gray-600 space-y-1">
                    <p className="font-medium">Password must contain:</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      <li>At least 8 characters</li>
                      <li>One uppercase letter</li>
                      <li>One lowercase letter</li>
                      <li>One number</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    className={`form-input ${errors.password.confirmPassword ? '!border-red-300' : ''}`}
                    placeholder="Confirm new password"
                    required
                  />
                  {errors.password.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.confirmPassword}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading.password}
                  className="btn btn-primary min-w-[140px]"
                >
                  {loading.password ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </span>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Danger Zone Section */}
          <div className="section-container border-red-200 bg-red-50/50">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Danger Zone</h2>
            <p className="text-sm text-red-700 mb-4">
              Once you delete your account, there is no going back. This action is permanent and
              cannot be undone.
            </p>
            <button
              type="button"
              onClick={openDeleteModal}
              className="btn bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border-0"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* First Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Account"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete your account? This action cannot be undone and all your
            data will be permanently deleted.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="btn btn-tertiary"
            >
              Cancel
            </button>
            <button type="button" onClick={confirmFirstStep} className="btn btn-primary">
              Continue
            </button>
          </div>
        </div>
      </Modal>

      {/* Second Confirmation Modal */}
      <Modal
        isOpen={confirmDeleteModalOpen}
        onClose={() => {
          setConfirmDeleteModalOpen(false);
          setDeleteConfirmText('');
        }}
        title="Final Confirmation"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            To confirm deletion, please type <strong className="text-red-600">DELETE</strong> in the
            box below:
          </p>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className="form-input"
            placeholder="Type DELETE to confirm"
          />
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setConfirmDeleteModalOpen(false);
                setDeleteConfirmText('');
              }}
              className="btn btn-tertiary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE' || loading.delete}
              className="btn bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading.delete ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete My Account'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </ProtectedRoute>
  );
}
