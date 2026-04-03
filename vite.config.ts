import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fetchUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        const req = mod.get(url, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        });
        req.on('error', reject);
        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

function postUrl(url: string, body: string, headers: Record<string, string>): Promise<string> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const req = https.request(
            {
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Length': Buffer.byteLength(body),
                },
            },
            (res) => {
                const chunks: Buffer[] = [];
                res.on('data', (chunk: Buffer) => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
            }
        );
        req.on('error', reject);
        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        req.write(body);
        req.end();
    });
}

function parseXml(xml: string) {
    const segments: { start: number; dur: number; text: string }[] = [];

    const pRegex = /<p[^>]*t="(\d+)"[^>]*d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
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
        if (text) segments.push({ start, dur, text });
    }

    if (segments.length === 0) {
        const tRegex = /<text[^>]*start="([\d.]+)"[^>]*dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
        while ((match = tRegex.exec(xml)) !== null) {
            const start = parseFloat(match[1]);
            const dur = parseFloat(match[2]);
            const text = match[3]
                .replace(/<[^>]+>/g, '')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/\n/g, ' ')
                .trim();
            if (text) segments.push({ start, dur, text });
        }
    }

    return segments;
}

async function fetchCaptionsViaInnertube(videoId: string, lang: string) {
    try {
        const body = JSON.stringify({
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
        });

        const playerData = await postUrl(
            'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
            body,
            {
                'Content-Type': 'application/json',
                'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
            }
        );

        const parsed = JSON.parse(playerData);
        return parsed.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
    } catch {
        return null;
    }
}

async function fetchCaptionsViaWebScrape(videoId: string, lang: string) {
    try {
        const html = await fetchUrl(`https://www.youtube.com/watch?v=${videoId}`);

        // Method 1: balanced-brace extraction of ytInitialPlayerResponse
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

        // Method 2: regex for captionTracks
        const match = html.match(/"captionTracks":(\[.*?\])/);
        if (match) {
            try {
                const tracks = JSON.parse(match[1]);
                if (tracks.length > 0) return tracks;
            } catch { /* ignore */ }
        }

        return null;
    } catch {
        return null;
    }
}

async function sendProxyRequest(targetUrl: string, method: string, headers: any, bodyData: string | undefined, res: any) {
    return new Promise<void>((resolve, reject) => {
        const parsed = new URL(targetUrl);
        const mod = targetUrl.startsWith('https') ? https : http;
        
        const reqOpts = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: method,
            headers: {
                'Content-Type': headers['content-type'] || 'application/json',
                'User-Agent': headers['x-custom-ua'] || 'Mozilla/5.0',
            } as any
        };

        if (bodyData) {
            reqOpts.headers['Content-Length'] = Buffer.byteLength(bodyData);
        }

        const proxyReq = mod.request(reqOpts, (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 200, {
                'Content-Type': proxyRes.headers['content-type'] || 'text/plain',
                'Access-Control-Allow-Origin': '*',
            });
            
            const chunks: Buffer[] = [];
            proxyRes.on('data', Buffer.prototype.push.bind(chunks));
            proxyRes.on('end', () => {
                res.end(Buffer.concat(chunks));
                resolve();
            });
        });

        proxyReq.on('error', reject);
        if (bodyData) {
            proxyReq.write(bodyData);
        }
        proxyReq.end();
    });
}

function apiDevPlugin(): Plugin {
    return {
        name: 'api-dev-plugin',
        configureServer(server) {
            // Return a function so it runs BEFORE Vite's internal middleware (SPA fallback)
            server.middlewares.use('/api/getSubtitles', async (req: any, res: any) => {
                console.log('[API] Subtitle request received:', req.url);

                const fullUrl = new URL(req.url || '/', 'http://localhost');
                const videoId = fullUrl.searchParams.get('videoId');
                const lang = fullUrl.searchParams.get('lang') || 'en';

                if (!videoId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'videoId is required' }));
                    return;
                }

                try {
                    // Strategy 1: Innertube ANDROID API
                    console.log('[API] Trying Innertube for videoId:', videoId);
                    let captions = await fetchCaptionsViaInnertube(videoId, lang);

                    // Strategy 2: Web page scraping fallback
                    if (!captions || captions.length === 0) {
                        console.log('[API] Innertube failed, trying web scrape...');
                        captions = await fetchCaptionsViaWebScrape(videoId, lang);
                    }

                    console.log('[API] Final caption tracks:', captions?.length || 0);

                    if (!captions || captions.length === 0) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ primary: [], secondary: [] }));
                        return;
                    }

                    const primaryTrack =
                        captions.find((c: any) => c.languageCode === lang) ||
                        captions.find((c: any) => c.languageCode.startsWith('en')) ||
                        captions[0];

                    const secondaryLang = lang.startsWith('en') ? 'zh' : 'en';
                    const secondaryTrack = captions.find((c: any) =>
                        c.languageCode.startsWith(secondaryLang)
                    );

                    const fetchSubs = async (track: any) => {
                        if (!track) return [];
                        const xmlUrl = track.baseUrl + '&fmt=srv3';
                        console.log('[API] Fetching subtitle XML for:', track.languageCode);
                        const xml = await fetchUrl(xmlUrl);
                        return parseXml(xml);
                    };

                    const [primary, secondary] = await Promise.all([
                        fetchSubs(primaryTrack),
                        fetchSubs(secondaryTrack),
                    ]);

                    console.log('[API] Parsed subtitles - primary:', primary.length, 'secondary:', secondary.length);

                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    });
                    res.end(JSON.stringify({ primary, secondary }));
                } catch (error: any) {
                    console.error('[API] Error:', error.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });

            server.middlewares.use('/api/proxy', async (req: any, res: any) => {
                // Handle local CORS proxy request
                if (req.method === 'OPTIONS') {
                    res.writeHead(200, {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, X-Custom-UA',
                    });
                    res.end();
                    return;
                }

                const fullUrl = new URL(req.url || '/', 'http://localhost');
                const targetUrl = fullUrl.searchParams.get('url');

                if (!targetUrl) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'url is required' }));
                    return;
                }

                try {
                    let bodyData = '';
                    if (req.method === 'POST') {
                        const chunks: Buffer[] = [];
                        req.on('data', (chunk: Buffer) => chunks.push(chunk));
                        req.on('end', async () => {
                            bodyData = Buffer.concat(chunks).toString('utf-8');
                            await sendProxyRequest(targetUrl, req.method, req.headers, bodyData, res);
                        });
                        return;
                    }
                    await sendProxyRequest(targetUrl, req.method, req.headers, undefined, res);
                } catch (e: any) {
                    console.error('[Proxy] Error:', e.message);
                    res.writeHead(500);
                    res.end();
                }
            });
        },
    };
}

export default defineConfig({
    plugins: [
        apiDevPlugin(),
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
            manifest: {
                name: 'Shadowing — 語言跟讀學習',
                short_name: 'Shadowing',
                description: '沉浸式語言跟讀學習工具',
                theme_color: '#0f172a',
                background_color: '#0f172a',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                icons: [
                    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        host: true,
        port: 5173,
    },
});
