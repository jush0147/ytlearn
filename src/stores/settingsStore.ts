import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SettingsState } from '../types';

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            supabaseUrl: '',
            supabaseAnonKey: '',
            geminiApiKey: '',
            azureApiKey: '',
            azureRegion: '',
            setSupabaseUrl: (url) => set({ supabaseUrl: url }),
            setSupabaseAnonKey: (key) => set({ supabaseAnonKey: key }),
            setGeminiApiKey: (key) => set({ geminiApiKey: key }),
            setAzureApiKey: (key) => set({ azureApiKey: key }),
            setAzureRegion: (region) => set({ azureRegion: region }),
        }),
        { name: 'shadowing-settings' }
    )
);
