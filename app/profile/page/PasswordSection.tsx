import { Loader2 } from 'lucide-react';
import type { PasswordStrength } from './types';
import type { PasswordFormState } from './usePasswordForm';

function PasswordStrengthIndicator({ strength }: { strength: PasswordStrength }) {
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-600 min-w-[80px]">{strength.text}</span>
      </div>
    </div>
  );
}

function PasswordRequirements() {
  return (
    <div className="mt-3 text-xs text-gray-600 space-y-1">
      <p className="font-medium">Password must contain:</p>
      <ul className="list-disc list-inside space-y-0.5 ml-2">
        <li>At least 8 characters</li>
        <li>One uppercase letter</li>
        <li>One lowercase letter</li>
        <li>One number</li>
      </ul>
    </div>
  );
}

export default function PasswordSection({ form }: { form: PasswordFormState }) {
  const { passwordData, setPasswordData, saving, errors, passwordStrength } = form;

  return (
    <div className="section-container mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Change Password</h2>

      <form
        onSubmit={(e) => {
          void form.handlePasswordSubmit(e);
        }}
      >
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
              className={`form-input ${errors.currentPassword ? '!border-red-300' : ''}`}
              placeholder="Enter current password"
              required
            />
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
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
              className={`form-input ${errors.newPassword ? '!border-red-300' : ''}`}
              placeholder="Enter new password"
              required
            />
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
            )}

            {/* Password Strength Indicator */}
            {passwordData.newPassword && <PasswordStrengthIndicator strength={passwordStrength} />}

            {/* Password Requirements */}
            <PasswordRequirements />
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
              className={`form-input ${errors.confirmPassword ? '!border-red-300' : ''}`}
              placeholder="Confirm new password"
              required
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn btn-primary min-w-[140px]">
            {saving ? (
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
  );
}
