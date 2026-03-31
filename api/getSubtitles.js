export default async function handler(req, res) {
    const { videoId, lang = 'en' } = req.query;

    if (!videoId) {
        return res.status(400).json({ error: 'videoId is required' });
    }

    // Set CORS headers early (before any early returns)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=3600');

    try {
        // Try multiple clients in order of reliability from server IPs
        const captions = await fetchCaptionTracksWithFallback(videoId, lang);

        if (!captions || captions.length === 0) {
            // Last resort: direct timedtext API (works for some videos without player data)
            const directPrimary = await fetchDirectTimedtext(videoId, lang);
            return res.status(200).json({ primary: directPrimary, secondary: [] });
        }

        // Find primary track
        const primaryTrack =
            captions.find((c) => c.languageCode === lang) ||
            captions.find((c) => c.languageCode.startsWith('en')) ||
            captions[0];

        // Find secondary track
        const secondaryLang = lang.startsWith('en') ? 'zh' : 'en';
        const secondaryTrack = captions.find((c) =>
            c.languageCode.startsWith(secondaryLang)
        );

        const fetchXml = async (track) => {
            if (!track) return [];
            try {
                const url = track.baseUrl + '&fmt=srv3';
                const xmlRes = await fetch(url);
                if (!xmlRes.ok) return [];
                const xml = await xmlRes.text();
                return parseSubtitleXml(xml);
            } catch {
                return [];
            }
        };

        const [primary, secondary] = await Promise.all([
            fetchXml(primaryTrack),
            fetchXml(secondaryTrack),
        ]);

        return res.status(200).json({ primary, secondary });
    } catch (error) {
        console.error('Subtitle fetch error:', error);
        return res.status(500).json({ error: error.message });
    }
}

/**
 * Try multiple Innertube clients in order.
 * TVHTML5 is most reliable from datacenter IPs because YouTube doesn't
 * enforce po_token for it. IOS is second. ANDROID is last resort.
 */
async function fetchCaptionTracksWithFallback(videoId, lang) {
    const clients = [
        {
            name: 'TVHTML5',
            body: {
                context: {
                    client: {
                        clientName: 'TVHTML5',
                        clientVersion: '7.20230405.08.00',
                        hl: lang,
                        gl: 'US',
                        utcOffsetMinutes: 0,
                    },
                },
                videoId,
                contentCheckOk: true,
                racyCheckOk: true,
            },
            headers: {
                'Content-Type': 'application/json',
                'User-Agent':
                    'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.0 TV Safari/538.1',
            },
        },
        {
            name: 'IOS',
            body: {
                context: {
                    client: {
                        clientName: 'IOS',
                        clientVersion: '19.09.3',
                        deviceMake: 'Apple',
                        deviceModel: 'iPhone16,2',
                        osName: 'iPhone',
                        osVersion: '17.5.1.21F90',
                        hl: lang,
                        gl: 'US',
                        utcOffsetMinutes: 0,
                    },
                },
                videoId,
                contentCheckOk: true,
                racyCheckOk: true,
            },
            headers: {
                'Content-Type': 'application/json',
                'User-Agent':
                    'com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)',
            },
        },
        {
            name: 'ANDROID',
            body: {
                context: {
                    client: {
                        clientName: 'ANDROID',
                        clientVersion: '20.10.38',
                        androidSdkVersion: 34,
                        hl: lang,
                        gl: 'US',
                        utcOffsetMinutes: 0,
                    },
                },
                videoId,
                contentCheckOk: true,
                racyCheckOk: true,
            },
            headers: {
                'Content-Type': 'application/json',
                'User-Agent':
                    'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
            },
        },
    ];

    for (const client of clients) {
        try {
            const response = await fetch(
                'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
                {
                    method: 'POST',
                    headers: client.headers,
                    body: JSON.stringify(client.body),
                }
            );

            if (!response.ok) {
                console.warn(`[${client.name}] Player API HTTP ${response.status}`);
                continue;
            }

            const data = await response.json();
            const tracks =
                data.captions?.playerCaptionsTracklistRenderer?.captionTracks;

            if (tracks && tracks.length > 0) {
                console.log(`[${client.name}] Got ${tracks.length} caption tracks`);
                return tracks;
            }

            console.warn(`[${client.name}] No caption tracks in response`);
        } catch (e) {
            console.error(`[${client.name}] Request failed:`, e.message);
        }
    }

    return null;
}

/**
 * Fallback: fetch captions directly via timedtext API.
 * Bypasses the player endpoint entirely; works for some public videos.
 */
async function fetchDirectTimedtext(videoId, lang) {
    try {
        const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=srv3`;
        const res = await fetch(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
            },
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseSubtitleXml(xml);
    } catch {
        return [];
    }
}

function parseSubtitleXml(xml) {
    const segments = [];

    // srv3 format: <p t="..." d="...">...</p>
    const pRegex = /<p[^>]*t="(\d+)"[^>]*d="(\d+)"[^>]*>(.*?)<\/p>/gs;
    let match;
    while ((match = pRegex.exec(xml)) !== null) {
        const text = cleanText(match[3]);
        if (text) {
            segments.push({
                start: parseInt(match[1]) / 1000,
                dur: parseInt(match[2]) / 1000,
                text,
            });
        }
    }

    // timedtext fallback format: <text start="..." dur="...">...</text>
    if (segments.length === 0) {
        const textRegex =
            /<text[^>]*start="([\d.]+)"[^>]*dur="([\d.]+)"[^>]*>(.*?)<\/text>/gs;
        while ((match = textRegex.exec(xml)) !== null) {
            const text = cleanText(match[3]);
            if (text) {
                segments.push({
                    start: parseFloat(match[1]),
                    dur: parseFloat(match[2]),
                    text,
                });
            }
        }
    }

    return segments;
}

function cleanText(raw) {
    return raw
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, c) =>
            String.fromCharCode(parseInt(c, 16))
        )
        .replace(/\n/g, ' ')
        .trim();
}
