/**
 * Extract YouTube video ID from various URL formats
 */
export function extractVideoId(input: string): string | null {
    // Already a video ID (11 chars)
    if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
        return input.trim();
    }

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /[?&]v=([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) return match[1];
    }

    return null;
}

/**
 * Format seconds to mm:ss
 */
export function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Tokenize a sentence into words, stripping punctuation for matching but keeping original text
 */
export function tokenizeWords(sentence: string): { original: string; clean: string }[] {
    return sentence
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => ({
            original: w,
            clean: w.replace(/[^\w'-]/g, '').toLowerCase(),
        }));
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T & { cancel: () => void } {
    let timer: ReturnType<typeof setTimeout>;
    const debounced = (...args: unknown[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
    debounced.cancel = () => clearTimeout(timer);
    return debounced as T & { cancel: () => void };
}
