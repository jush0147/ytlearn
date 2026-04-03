export default async function handler(req, res) {
    const { videoId, lang = 'en' } = req.query;

    if (!videoId) {
        return res.status(400).json({ error: 'videoId is required' });
    }

    // Set CORS headers early
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=1800');

    try {
        // Strategy 1: Innertube ANDROID API
        let captions = await fetchViaInnertube(videoId, lang);

        // Strategy 2: Web page scraping fallback
        if (!captions || captions.length === 0) {
            console.log('[S2] Innertube failed, trying web scrape...');
            captions = await fetchViaWebScrape(videoId, lang);
        }

        // Strategy 3: Invidious API fallback (multiple instances)
        if (!captions || captions.length === 0) {
            console.log('[S3] Web scrape failed, trying Invidious...');
            const result = await fetchViaInvidious(videoId, lang);
            if (result) {
                return res.status(200).json(result);
            }
        }

        if (!captions || captions.length === 0) {
            return res.status(200).json({ primary: [], secondary: [] });
        }

        // Find primary language track
        const primaryTrack =
            captions.find((c) => c.languageCode === lang) ||
            captions.find((c) => c.languageCode.startsWith('en')) ||
            captions[0];

        const secondaryLang = lang.startsWith('en') ? 'zh' : 'en';
        const secondaryTrack =
            captions.find((c) => c.languageCode.startsWith(secondaryLang));

        const [primary, secondary] = await Promise.all([
            fetchAndParseXml(primaryTrack),
            fetchAndParseXml(secondaryTrack),
        ]);

        return res.status(200).json({ primary, secondary });
    } catch (error) {
        console.error('Subtitle fetch error:', error);
        return res.status(500).json({ error: error.message });
    }
}

// ── Strategy 1: Innertube ANDROID API ──────────────────────────────────
async function fetchViaInnertube(videoId, lang) {
    try {
        const response = await fetch(
            'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
                },
                body: JSON.stringify({
                    context: {
                        client: {
                            clientName: 'ANDROID',
                            clientVersion: '20.10.38',
                            androidSdkVersion: 34,
                            hl: lang,
                            gl: 'US',
                        },
                    },
                    videoId,
                }),
            }
        );
        if (!response.ok) return null;
        const data = await response.json();
        return data.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
    } catch (e) {
        console.error('[Innertube] Error:', e.message);
        return null;
    }
}

// ── Strategy 2: Web page scraping ──────────────────────────────────────
async function fetchViaWebScrape(videoId, lang) {
    try {
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                'Accept-Language': `${lang},en;q=0.9`,
            },
        });
        if (!response.ok) return null;
        const html = await response.text();

        // balanced-brace extraction
        const marker = 'var ytInitialPlayerResponse = ';
        const idx = html.indexOf(marker);
        if (idx !== -1) {
            const start = idx + marker.length;
            let depth = 0;
            for (let i = start; i < html.length; i++) {
                if (html[i] === '{') depth++;
                else if (html[i] === '}') {
                    depth--;
                    if (depth === 0) {
                        try {
                            const data = JSON.parse(html.slice(start, i + 1));
                            const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                            if (tracks?.length) return tracks;
                        } catch { /* ignore */ }
                        break;
                    }
                }
            }
        }

        // regex fallback
        const match = html.match(/"captionTracks":(\[.*?\])/);
        if (match) {
            try {
                const tracks = JSON.parse(match[1]);
                if (tracks.length > 0) return tracks;
            } catch { /* ignore */ }
        }

        return null;
    } catch (e) {
        console.error('[WebScrape] Error:', e.message);
        return null;
    }
}

// ── Strategy 3: Invidious API (multiple public instances) ──────────────
const INVIDIOUS_INSTANCES = [
    'https://inv.tux.pizza',
    'https://invidious.nerdvpn.de',
    'https://iv.datura.network',
    'https://invidious.privacyredirect.com',
    'https://yewtu.be',
];

async function fetchViaInvidious(videoId, lang) {
    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            // Step 1: Get caption list
            const listUrl = `${instance}/api/v1/captions/${videoId}`;
            const listRes = await fetch(listUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(8000),
            });
            if (!listRes.ok) continue;

            const listData = await listRes.json();
            const captionList = listData.captions || [];
            if (captionList.length === 0) continue;

            console.log(`[Invidious] ${instance} found ${captionList.length} tracks`);

            // Find primary track
            const primaryCap =
                captionList.find((c) => c.language_code === lang) ||
                captionList.find((c) => c.language_code?.startsWith('en')) ||
                captionList[0];

            const secondaryLang = lang.startsWith('en') ? 'zh' : 'en';
            const secondaryCap =
                captionList.find((c) => c.language_code?.startsWith(secondaryLang));

            // Step 2: Fetch the actual subtitle content
            const fetchInvSubs = async (cap) => {
                if (!cap) return [];
                // Invidious returns captions in VTT or various formats
                // Use the label URL with format=json3 or fetch XML
                const subUrl = `${instance}${cap.url}&fmt=srv3`;
                const subRes = await fetch(subUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    signal: AbortSignal.timeout(8000),
                });
                if (!subRes.ok) return [];
                const xml = await subRes.text();
                return parseSubtitleXml(xml);
            };

            const [primary, secondary] = await Promise.all([
                fetchInvSubs(primaryCap),
                fetchInvSubs(secondaryCap),
            ]);

            if (primary.length > 0) {
                return { primary, secondary };
            }
        } catch (e) {
            console.error(`[Invidious] ${instance} error:`, e.message);
            continue;
        }
    }
    return null;
}

// ── Shared: Fetch & Parse XML ──────────────────────────────────────────
async function fetchAndParseXml(track) {
    if (!track) return [];
    const url = track.baseUrl + '&fmt=srv3';
    const xmlRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const xml = await xmlRes.text();
    return parseSubtitleXml(xml);
}

function decodeEntities(str) {
    return str
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
        .replace(/\n/g, ' ')
        .trim();
}

function parseSubtitleXml(xml) {
    const segments = [];

    // srv3 format: <p t="ms" d="ms">text</p>
    const pRegex = /<p[^>]*t="(\d+)"[^>]*d="(\d+)"[^>]*>(.*?)<\/p>/gs;
    let match;
    while ((match = pRegex.exec(xml)) !== null) {
        const start = parseInt(match[1]) / 1000;
        const dur = parseInt(match[2]) / 1000;
        const text = decodeEntities(match[3]);
        if (text) segments.push({ start, dur, text });
    }

    // Fallback: timedtext format
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
