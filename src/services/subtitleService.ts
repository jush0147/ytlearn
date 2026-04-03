import type { SubtitleSegment } from '../types';

/**
 * Fetch subtitles by calling YouTube Innertube API from the browser.
 * Uses Vercel CORS proxy (/api/proxy) to bypass CORS restrictions.
 * The actual YouTube API call originates from the user's IP (not blocked).
 */
export async function fetchSubtitles(
    videoId: string,
    languageCode: string = 'en'
): Promise<{ primary: SubtitleSegment[]; secondary: SubtitleSegment[] }> {
    const empty = { primary: [], secondary: [] };

    // Strategy 1: Try the old server-side endpoint first (works for some videos)
    try {
        const serverRes = await fetch(`/api/getSubtitles?videoId=${videoId}&lang=${languageCode}&_t=${Date.now()}`);
        if (serverRes.ok) {
            const data = await serverRes.json();
            if (data.primary?.length > 0) {
                return data;
            }
        }
    } catch { /* fall through to client-side */ }

    // Strategy 2: Client-side Innertube via CORS proxy
    const captions = await fetchCaptionTracksViaProxy(videoId, languageCode);
    if (!captions || captions.length === 0) {
        return empty;
    }

    // Find primary track
    const primaryTrack =
        captions.find((c: CaptionTrack) => c.languageCode === languageCode) ||
        captions.find((c: CaptionTrack) => c.languageCode.startsWith('en')) ||
        captions[0];

    // Find secondary track
    const secondaryLang = languageCode.startsWith('en') ? 'zh' : 'en';
    const secondaryTrack = captions.find((c: CaptionTrack) =>
        c.languageCode.startsWith(secondaryLang)
    );

    // Fetch subtitle XMLs via proxy
    const [primary, secondary] = await Promise.all([
        fetchSubtitleXmlViaProxy(primaryTrack),
        fetchSubtitleXmlViaProxy(secondaryTrack),
    ]);

    return { primary, secondary };
}

interface CaptionTrack {
    baseUrl: string;
    languageCode: string;
    name?: { simpleText?: string };
    kind?: string;
}

/**
 * Call YouTube Innertube API via our CORS proxy
 */
async function fetchCaptionTracksViaProxy(
    videoId: string,
    lang: string
): Promise<CaptionTrack[] | null> {
    const clients = [
        {
            name: 'ANDROID',
            version: '20.10.38',
            ua: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
            extra: { androidSdkVersion: 34 },
        },
        {
            name: 'WEB',
            version: '2.20240530.02.00',
            ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            extra: {},
        },
    ];

    for (const client of clients) {
        try {
            const inntertubeUrl = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
            const proxyUrl = `/api/proxy?url=${encodeURIComponent(inntertubeUrl)}`;

            const res = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Custom-UA': client.ua,
                },
                body: JSON.stringify({
                    context: {
                        client: {
                            clientName: client.name,
                            clientVersion: client.version,
                            hl: lang,
                            gl: 'US',
                            ...client.extra,
                        },
                    },
                    videoId,
                }),
            });

            if (!res.ok) continue;
            const data = await res.json();
            const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (tracks?.length) return tracks;
        } catch {
            continue;
        }
    }

    return null;
}

/**
 * Fetch subtitle XML via proxy and parse it
 */
async function fetchSubtitleXmlViaProxy(
    track: CaptionTrack | undefined
): Promise<SubtitleSegment[]> {
    if (!track) return [];

    try {
        const xmlUrl = track.baseUrl + '&fmt=srv3';
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(xmlUrl)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) return [];
        const xml = await res.text();
        return parseSubtitleXml(xml);
    } catch {
        return [];
    }
}

/**
 * Parse srv3/timedtext XML into SubtitleSegment array
 */
function parseSubtitleXml(xml: string): SubtitleSegment[] {
    const segments: SubtitleSegment[] = [];

    // srv3 format: <p t="ms" d="ms">text</p>
    const pRegex = /<p[^>]*t="(\d+)"[^>]*d="(\d+)"[^>]*>(.*?)<\/p>/gs;
    let match;
    while ((match = pRegex.exec(xml)) !== null) {
        const start = parseInt(match[1]) / 1000;
        const dur = parseInt(match[2]) / 1000;
        const text = decodeEntities(match[3]);
        if (text) segments.push({ start, dur, text });
    }

    // timedtext fallback: <text start="s" dur="s">text</text>
    if (segments.length === 0) {
        const textRegex = /<text[^>]*start="([\d.]+)"[^>]*dur="([\d.]+)"[^>]*>(.*?)<\/text>/gs;
        while ((match = textRegex.exec(xml)) !== null) {
            const start = parseFloat(match[1]);
            const dur = parseFloat(match[2]);
            const text = decodeEntities(match[3]);
            if (text) segments.push({ start, dur, text });
        }
    }

    return segments;
}

function decodeEntities(str: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str.replace(/<[^>]+>/g, '');
    return textarea.value.replace(/\n/g, ' ').trim();
}
