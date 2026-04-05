import type { SubtitleSegment } from '../types';

interface CaptionTrack {
    baseUrl: string;
    languageCode: string;
    name?: { simpleText?: string };
    kind?: string;
}

/**
 * Fetch subtitles for a video.
 * 
 * Architecture:
 * 1. Server (/api/getSubtitles) scrapes the YT watch page and returns captionTracks metadata.
 *    This works because we only need the HTML, not the actual XML.
 * 2. The BROWSER fetches the subtitle XML directly from YouTube's timedtext API.
 *    timedtext URLs have CORS headers (Access-Control-Allow-Origin: *), so this works.
 *    Also, the IP validation in the signed URL is based on the requester's IP,
 *    not the server's IP — so fetching from browser bypasses the Vercel IP block.
 */
export async function fetchSubtitles(
    videoId: string,
    languageCode: string = 'en'
): Promise<{ primary: SubtitleSegment[]; secondary: SubtitleSegment[] }> {
    const empty = { primary: [], secondary: [] };

    let tracks: CaptionTrack[] | null = null;

    // Strategy 1: Get track list from our server (which scrapes the YT watch page)
    try {
        const res = await fetch(`/api/getSubtitles?videoId=${videoId}&lang=${languageCode}&_t=${Date.now()}`);
        if (res.ok) {
            const data = await res.json();
            if (data.tracks?.length > 0) {
                tracks = data.tracks;
                console.log('[subtitleService] Got tracks from server:', tracks!.length);
            }
        }
    } catch (e) {
        console.warn('[subtitleService] Server fetch failed:', e);
    }

    // Strategy 2: If server failed, try client-side via Innertube
    if (!tracks || tracks.length === 0) {
        console.log('[subtitleService] Falling back to client-side Innertube...');
        tracks = await fetchTracksViaInnertube(videoId, languageCode);
    }

    if (!tracks || tracks.length === 0) {
        console.warn('[subtitleService] No caption tracks found');
        return empty;
    }

    // Pick tracks
    const primaryTrack =
        tracks.find(c => c.languageCode === languageCode) ||
        tracks.find(c => c.languageCode.startsWith('en')) ||
        tracks[0];

    const secondaryLang = languageCode.startsWith('en') ? 'zh' : 'en';
    const secondaryTrack = tracks.find(c => c.languageCode.startsWith(secondaryLang));

    // Fetch XML directly from browser (CORS allowed by YouTube, browser IP avoids block)
    const [primary, secondary] = await Promise.all([
        primaryTrack ? fetchXmlDirect(primaryTrack.baseUrl) : Promise.resolve([]),
        secondaryTrack ? fetchXmlDirect(secondaryTrack.baseUrl) : Promise.resolve([]),
    ]);

    console.log(`[subtitleService] primary: ${primary.length}, secondary: ${secondary.length}`);
    return { primary, secondary };
}

/**
 * Fetch subtitle XML directly from the browser.
 * YouTube's timedtext endpoint has CORS headers, so this works cross-origin.
 */
async function fetchXmlDirect(baseUrl: string): Promise<SubtitleSegment[]> {
    try {
        // Try srv3 format first, fallback to default
        const url = baseUrl.includes('fmt=') ? baseUrl : baseUrl + '&fmt=srv3';
        const res = await fetch(url);
        if (!res.ok) return [];
        const xml = await res.text();
        if (!xml || xml.length < 10) {
            // Try without fmt parameter
            const res2 = await fetch(baseUrl);
            if (!res2.ok) return [];
            return parseSubtitleXml(await res2.text());
        }
        return parseSubtitleXml(xml);
    } catch {
        return [];
    }
}

/**
 * Fallback: call YouTube Innertube directly from browser.
 * This works because it's the user's IP, not Vercel's.
 */
async function fetchTracksViaInnertube(videoId: string, lang: string): Promise<CaptionTrack[] | null> {
    const clients = [
        { name: 'ANDROID', version: '20.10.38', ua: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)', extra: { androidSdkVersion: 34 } },
        { name: 'WEB', version: '2.20240530.02.00', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', extra: {} },
    ];

    for (const client of clients) {
        try {
            const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': client.ua,
                },
                body: JSON.stringify({
                    context: { client: { clientName: client.name, clientVersion: client.version, hl: lang, gl: 'US', ...client.extra } },
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

function parseSubtitleXml(xml: string): SubtitleSegment[] {
    const segments: SubtitleSegment[] = [];
    let match;

    // srv3 format: <p t="ms" d="ms">text</p>
    const pRegex = /<p[^>]*t="(\d+)"[^>]*d="(\d+)"[^>]*>(.*?)<\/p>/gs;
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
