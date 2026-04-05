import type { SubtitleSegment } from '../types';

/**
 * Fetch subtitles by calling our server-side API.
 * The server uses Android User-Agent which allows fetching subtitle XML from YouTube.
 */
export async function fetchSubtitles(
    videoId: string,
    languageCode: string = 'en'
): Promise<{ primary: SubtitleSegment[]; secondary: SubtitleSegment[] }> {
    const empty = { primary: [], secondary: [] };

    try {
        const res = await fetch(
            `/api/getSubtitles?videoId=${videoId}&lang=${languageCode}&_t=${Date.now()}`
        );
        if (!res.ok) {
            console.warn(`[subtitleService] API returned ${res.status}`);
            return empty;
        }
        const data = await res.json();
        console.log(
            `[subtitleService] Got subtitles: primary=${data.primary?.length ?? 0}, secondary=${data.secondary?.length ?? 0}`
        );
        return {
            primary: data.primary ?? [],
            secondary: data.secondary ?? [],
        };
    } catch (e) {
        console.error('[subtitleService] Fetch failed:', e);
        return empty;
    }
}
