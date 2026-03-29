import type { SubtitleSegment } from '../types';

/**
 * Fetch subtitles via Vercel proxy or directly via Innertube API
 * For development, we use a local proxy; for production, we use Vercel serverless
 */
export async function fetchSubtitles(
    videoId: string,
    languageCode: string = 'en'
): Promise<{ primary: SubtitleSegment[]; secondary: SubtitleSegment[] }> {
    // Try the Vercel API route first
    const baseUrl = import.meta.env.DEV ? '' : '';
    const res = await fetch(`${baseUrl}/api/getSubtitles?videoId=${videoId}&lang=${languageCode}`);

    if (!res.ok) {
        throw new Error(`Failed to fetch subtitles: ${res.statusText}`);
    }

    const data = await res.json();

    return {
        primary: data.primary || [],
        secondary: data.secondary || [],
    };
}

/**
 * Parse XML subtitle track into segments
 */
export function parseSubtitleXml(xml: string): SubtitleSegment[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const texts = doc.querySelectorAll('text');
    const segments: SubtitleSegment[] = [];

    texts.forEach((node) => {
        const start = parseFloat(node.getAttribute('start') || '0');
        const dur = parseFloat(node.getAttribute('dur') || '0');
        const text = decodeHtmlEntities(node.textContent || '');
        if (text.trim()) {
            segments.push({ start, dur, text: text.trim() });
        }
    });

    return segments;
}

function decodeHtmlEntities(str: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
}
