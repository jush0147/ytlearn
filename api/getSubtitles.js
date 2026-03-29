export default async function handler(req, res) {
    const { videoId, lang = 'en' } = req.query;

    if (!videoId) {
        return res.status(400).json({ error: 'videoId is required' });
    }

    try {
        // Use Innertube API to fetch player data
        const playerResponse = await fetch(
            'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent':
                        'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
                },
                body: JSON.stringify({
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
                }),
            }
        );

        if (!playerResponse.ok) {
            throw new Error(`Player API failed: ${playerResponse.status}`);
        }

        const playerData = await playerResponse.json();
        const captions = playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (!captions || captions.length === 0) {
            return res.status(200).json({ primary: [], secondary: [] });
        }

        // Find primary language track (requested language)
        const primaryTrack =
            captions.find((c) => c.languageCode === lang) ||
            captions.find((c) => c.languageCode.startsWith('en')) ||
            captions[0];

        // Find secondary track (Chinese if primary is English, English if primary is Chinese)
        const secondaryLang = lang.startsWith('en') ? 'zh' : 'en';
        const secondaryTrack =
            captions.find((c) => c.languageCode.startsWith(secondaryLang));

        // Fetch subtitle XMLs
        const fetchXml = async (track) => {
            if (!track) return [];
            const url = track.baseUrl + '&fmt=srv3';
            const xmlRes = await fetch(url);
            const xml = await xmlRes.text();
            return parseSubtitleXml(xml);
        };

        const [primary, secondary] = await Promise.all([
            fetchXml(primaryTrack),
            fetchXml(secondaryTrack),
        ]);

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Cache-Control', 's-maxage=3600');

        return res.status(200).json({ primary, secondary });
    } catch (error) {
        console.error('Subtitle fetch error:', error);
        return res.status(500).json({ error: error.message });
    }
}

function parseSubtitleXml(xml) {
    const segments = [];
    // Simple regex parser for srv3 format
    const pRegex = /<p[^>]*t="(\d+)"[^>]*d="(\d+)"[^>]*>(.*?)<\/p>/gs;
    let match;

    while ((match = pRegex.exec(xml)) !== null) {
        const start = parseInt(match[1]) / 1000;
        const dur = parseInt(match[2]) / 1000;
        const text = match[3]
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

        if (text) {
            segments.push({ start, dur, text });
        }
    }

    // Fallback: try timedtext format
    if (segments.length === 0) {
        const textRegex = /<text[^>]*start="([\d.]+)"[^>]*dur="([\d.]+)"[^>]*>(.*?)<\/text>/gs;
        while ((match = textRegex.exec(xml)) !== null) {
            const start = parseFloat(match[1]);
            const dur = parseFloat(match[2]);
            let text = match[3]
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

            if (text) {
                segments.push({ start, dur, text });
            }
        }
    }

    return segments;
}
