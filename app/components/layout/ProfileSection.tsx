'use client';

import { User } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { reportConsoleError } from '@/lib/logger';
import { fetchUserProfile, type UserProfile } from '@/lib/supabase/profiles';
import { useSidebarStore } from '@/store/useSidebarStore';

export default function ProfileSection() {
  const { user } = useAuth();
  const { isOpen, closeSidebar } = useSidebarStore();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const profileData = await fetchUserProfile(user.id);
        setProfile(profileData);
      } catch (error) {
        reportConsoleError('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [user?.id]);

  const handleClick = () => {
    router.push('/profile');
    // Auto-close sidebar on mobile after clicking profile
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      closeSidebar();
    }
  };

  // Don't render anything while loading or if no user
  if (loading || !user) {
    return null;
  }

  const fullName = profile?.full_name || 'User';
  const email = user.email || '';
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="px-2 pb-6">
      <button
        type="button"
        onClick={handleClick}
        className={`sidebar-item w-full flex items-center gap-3 rounded-md text-sm ${
          isOpen ? 'px-3 justify-start' : 'px-2 justify-center'
        }`}
        title={isOpen ? undefined : fullName}
        aria-label="View Profile"
      >
        {/* Avatar */}
        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-white/15 overflow-hidden flex items-center justify-center">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={fullName}
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-4 h-4 text-white" />
          )}
        </div>

        {/* User Info - Only shown when sidebar is expanded */}
        {isOpen && (
          <div className="flex-1 min-w-0 text-left">
            <div className="text-white font-medium text-sm truncate">{fullName}</div>
            <div className="text-white/65 text-xs truncate">{email}</div>
          </div>
        )}
      </button>
    </div>
  );
}
