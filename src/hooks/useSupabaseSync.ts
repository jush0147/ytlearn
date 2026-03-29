import { useEffect, useRef, useCallback } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useVocabStore } from '../stores/vocabStore';
import { fetchVocab, upsertVocab } from '../services/supabaseService';

/**
 * Hook for syncing vocab with Supabase
 * - On mount: pull remote vocab
 * - On changes: debounced push to remote
 */
export function useSupabaseSync() {
    const { supabaseUrl, supabaseAnonKey } = useSettingsStore();
    const { vocab, pendingSync, clearPendingSync, loadFromSupabase } = useVocabStore();
    const syncTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const isConfigured = supabaseUrl && supabaseAnonKey;

    // Pull on mount
    useEffect(() => {
        if (!isConfigured) return;

        fetchVocab(supabaseUrl, supabaseAnonKey)
            .then(loadFromSupabase)
            .catch((err) => console.warn('Supabase fetch failed:', err));
    }, [supabaseUrl, supabaseAnonKey]);

    // Debounced push
    const syncToRemote = useCallback(() => {
        if (!isConfigured || pendingSync.length === 0) return;

        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

        syncTimerRef.current = setTimeout(async () => {
            const entries = pendingSync
                .map((word) => vocab[word])
                .filter(Boolean);

            try {
                await upsertVocab(supabaseUrl, supabaseAnonKey, entries);
                clearPendingSync();
            } catch (err) {
                console.warn('Supabase sync failed:', err);
            }
        }, 2000);
    }, [isConfigured, pendingSync, vocab, supabaseUrl, supabaseAnonKey, clearPendingSync]);

    useEffect(() => {
        syncToRemote();
        return () => {
            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        };
    }, [syncToRemote]);
}
