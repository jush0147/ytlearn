import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VocabState, VocabStatus, VocabEntry } from '../types';

export const useVocabStore = create<VocabState>()(
    persist(
        (set, get) => ({
            vocab: {},
            pendingSync: [],

            setWordStatus: (word: string, status: VocabStatus) => {
                const normalizedWord = word.toLowerCase().trim();
                set((state) => ({
                    vocab: {
                        ...state.vocab,
                        [normalizedWord]: {
                            word: normalizedWord,
                            status,
                            updated_at: new Date().toISOString(),
                        },
                    },
                    pendingSync: state.pendingSync.includes(normalizedWord)
                        ? state.pendingSync
                        : [...state.pendingSync, normalizedWord],
                }));
            },

            getWordStatus: (word: string): VocabStatus => {
                const normalizedWord = word.toLowerCase().trim();
                return get().vocab[normalizedWord]?.status || 'unmarked';
            },

            loadFromSupabase: (entries: VocabEntry[]) => {
                set((state) => {
                    const newVocab = { ...state.vocab };
                    for (const entry of entries) {
                        const key = entry.word.toLowerCase().trim();
                        const existing = newVocab[key];
                        // Only overwrite if remote is newer or local doesn't exist
                        if (!existing || new Date(entry.updated_at) > new Date(existing.updated_at)) {
                            newVocab[key] = entry;
                        }
                    }
                    return { vocab: newVocab };
                });
            },

            clearPendingSync: () => set({ pendingSync: [] }),
        }),
        { name: 'shadowing-vocab' }
    )
);
