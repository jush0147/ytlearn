import type { VocabEntry } from '../types';

/**
 * Create a Supabase client for direct API calls (no SDK dependency)
 */
function supabaseRequest(url: string, anonKey: string, options: RequestInit = {}) {
    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'Prefer': 'return=minimal',
            ...options.headers,
        },
    });
}

/**
 * Fetch all vocab entries from Supabase
 */
export async function fetchVocab(supabaseUrl: string, anonKey: string): Promise<VocabEntry[]> {
    const res = await supabaseRequest(
        `${supabaseUrl}/rest/v1/user_vocab?select=word,status,updated_at`,
        anonKey
    );

    if (!res.ok) {
        throw new Error(`Supabase fetch failed: ${res.statusText}`);
    }

    return res.json();
}

/**
 * Upsert vocab entries to Supabase
 */
export async function upsertVocab(
    supabaseUrl: string,
    anonKey: string,
    entries: VocabEntry[]
): Promise<void> {
    if (entries.length === 0) return;

    const res = await supabaseRequest(
        `${supabaseUrl}/rest/v1/user_vocab`,
        anonKey,
        {
            method: 'POST',
            headers: {
                'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify(entries),
        }
    );

    if (!res.ok) {
        throw new Error(`Supabase upsert failed: ${res.statusText}`);
    }
}
