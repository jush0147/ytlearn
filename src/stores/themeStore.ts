import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeState } from '../types';

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            mode: 'system',
            setMode: (mode) => set({ mode }),
        }),
        { name: 'shadowing-theme' }
    )
);

export function applyTheme(mode: ThemeState['mode']) {
    const root = document.documentElement;
    if (mode === 'dark') {
        root.classList.add('dark');
    } else if (mode === 'light') {
        root.classList.remove('dark');
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }
}
