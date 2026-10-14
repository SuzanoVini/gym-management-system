import { Camera, Loader2, Upload } from 'lucide-react';
import type { ProfileFormState } from './useProfileForm';

interface ProfileInfoSectionProps {
  form: ProfileFormState;
  email: string | undefined;
}

export default function ProfileInfoSection({ form, email }: ProfileInfoSectionProps) {
  const { fileInputRef, profileData, setProfileData, previewUrl, saving, errors } = form;

  return (
    <div className="section-container mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>

      <form
        onSubmit={(e) => {
          void form.handleProfileSubmit(e);
        }}
      >
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
              onChange={form.handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-2 text-center">JPG, PNG or WebP (max 2MB)</p>
            {errors.avatar && <p className="text-xs text-red-600 mt-1">{errors.avatar}</p>}
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
                onChange={(e) => setProfileData((prev) => ({ ...prev, full_name: e.target.value }))}
                className={`form-input ${errors.full_name ? '!border-red-300' : ''}`}
                placeholder="Enter your full name"
                required
              />
              {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email || ''}
                className="form-input !bg-gray-100 !cursor-not-allowed"
                disabled
                readOnly
              />
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn btn-primary min-w-[120px]">
            {saving ? (
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
  );
}
