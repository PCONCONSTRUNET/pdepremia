import { create } from 'zustand'

interface UIState {
  isSidebarOpen: boolean
  isSpinningBox: boolean
  toggleSidebar: () => void
  setSidebarOpen: (isOpen: boolean) => void
  setSpinningBox: (isSpinning: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: window.innerWidth > 1024, // Open by default on desktop
  isSpinningBox: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setSpinningBox: (isSpinning) => set({ isSpinningBox: isSpinning }),
}))
