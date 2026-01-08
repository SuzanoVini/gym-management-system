import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface SidebarState {
  isOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

/**
 * Get initial sidebar state based on screen width
 * - Desktop (≥768px): Open by default
 * - Mobile (<768px): Closed by default
 */
const getInitialState = (): boolean => {
  if (typeof window === 'undefined') {
    return true; // SSR: default to open
  }
  return window.innerWidth >= 768; // md breakpoint
};

export const useSidebarStore = create<SidebarState>()(
  devtools(
    (set) => ({
      isOpen: getInitialState(),
      toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),
      openSidebar: () => set({ isOpen: true }),
      closeSidebar: () => set({ isOpen: false }),
    }),
    { name: 'sidebar-store' }
  )
);
