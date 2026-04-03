import https from 'https';

export default async function handler(req, res) {
    const { videoId, lang = 'en' } = req.query || {};

    if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId' });
    }

    console.log(`[getSubtitles] Fetching for ${videoId} (${lang})`);

    try {
        // Multi-strategy rotating fetch
        const strategies = [
            { name: 'ANDROID', client: 'ANDROID', version: '20.10.38' },
            { name: 'MWEB', client: 'MWEB', version: '2.20240530.07.00' },
            { name: 'TV', client: 'TVHTML5', version: '7.20230405.08.01' },
            { name: 'IOS', client: 'IOS', version: '19.45.4' }
        ];

        for (const strategy of strategies) {
            console.log(`[getSubtitles] Trying strategy: ${strategy.name}`);
            const result = await fetchViaInnertube(videoId, lang, strategy);
            if (result && result.length > 0) {
                console.log(`[getSubtitles] Strategy ${strategy.name} SUCCESS!`);
                return res.status(200).json(result);
            }
        }

        // Final fallback: Web Scrape
        console.log(`[getSubtitles] Trying Web Scrape fallback`);
        const scrapeResult = await fetchViaWebScrape(videoId, lang);
        if (scrapeResult && scrapeResult.length > 0) {
             return res.status(200).json(scrapeResult);
        }

        return res.status(404).json({ error: 'No subtitles found for this video.' });
    } catch (error) {
        console.error('[getSubtitles] Critical error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch subtitles', details: error.message });
    }
}

async function fetchViaInnertube(videoId, lang, strategy) {
    try {
        const body = JSON.stringify({
            context: {
                client: {
                    clientName: strategy.client,
                    clientVersion: strategy.version,
                    hl: lang,
                    gl: 'US',
                },
            },
            videoId,
        });

        const hostname = 'www.youtube.com';
        const path = '/youtubei/v1/player?prettyPrint=false';

        const options = {
            hostname,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': `Mozilla/5.0 (${strategy.name === 'IOS' ? 'iPhone; CPU iPhone OS 17_5 like Mac OS X' : 'Linux; Android 14'})`,
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const resBody = await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                const chunks = [];
                res.on('data', (d) => chunks.push(d));
                res.on('end', () => resolve(Buffer.concat(chunks).toString()));
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });

        const data = JSON.parse(resBody);
        const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (!tracks || tracks.length === 0) return null;

        const track = tracks.find(t => t.languageCode === lang) || tracks[0];
        return await fetchTranscriptFromUrl(track.baseUrl);
    } catch {
        return null;
    }
}

async function fetchViaWebScrape(videoId, lang) {
    try {
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept-Language': lang
            }
        };

        const html = await new Promise((resolve, reject) => {
            https.get(url, options, (res) => {
                const chunks = [];
                res.on('data', (d) => chunks.push(d));
                res.on('end', () => resolve(Buffer.concat(chunks).toString()));
            }).on('error', reject);
        });

        const marker = 'var ytInitialPlayerResponse = ';
        const idx = html.indexOf(marker);
        if (idx === -1) return null;

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
                        if (!tracks || tracks.length === 0) return null;
                        const track = tracks.find(t => t.languageCode === lang) || tracks[0];
                        return await fetchTranscriptFromUrl(track.baseUrl);
                    } catch { return null; }
                }
            }
        }
    } catch {
        return null;
    }
}

async function fetchTranscriptFromUrl(url) {
    try {
        return await new Promise((resolve, reject) => {
            https.get(url, (res) => {
                const chunks = [];
                res.on('data', (d) => chunks.push(d));
                res.on('end', () => {
                    const xml = Buffer.concat(chunks).toString();
                    resolve(parseTranscriptXml(xml));
                });
            }).on('error', reject);
        });
    } catch {
        return null;
    }
}

function parseTranscriptXml(xml) {
    const segments = [];
    const regex = /<text start="([\d.]+)" dur="([\d.]+)">(.*?)<\/text>/g;
    let match;

    while ((match = regex.exec(xml)) !== null) {
        segments.push({
            start: parseFloat(match[1]),
            duration: parseFloat(match[2]),
            text: decodeHtmlEntities(match[3])
        });
    }

    return segments;
}

function decodeHtmlEntities(str) {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
}
