import https from 'https';

const ANDROID_UA = 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)';

function httpsRequest(method, url, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const opts = { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method, headers };
        if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
        const req = https.request(opts, (res) => {
            const chunks = [];
            res.on('data', d => chunks.push(d));
            res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf-8') }));
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
        if (body) req.write(body);
        req.end();
    });
}

async function test(videoId) {
    console.log(`\n=== Testing ${videoId} ===`);
    
    // Step 1: Get HTML watch page (like Vercel does) with browser UA
    const htmlRes = await httpsRequest('GET', `https://www.youtube.com/watch?v=${videoId}`, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
    });
    
    const m = htmlRes.body.match(/"captionTracks":(\[.*?\])/);
    if (!m) { console.log('No captionTracks in HTML'); return; }
    
    const tracks = JSON.parse(m[1]);
    console.log(`Found ${tracks.length} tracks in HTML`);
    
    const enTrack = tracks.find(t => t.languageCode === 'en') || tracks[0];
    console.log(`Using track: ${enTrack.languageCode} (${enTrack.kind || 'manual'})`);
    
    // Step 2: Fetch XML using Android UA (KEY: different UA for XML fetch)
    const xmlRes = await httpsRequest('GET', enTrack.baseUrl + '&fmt=srv3', {
        'User-Agent': ANDROID_UA
    });
    
    console.log(`XML status: ${xmlRes.status}, length: ${xmlRes.body.length}`);
    if (xmlRes.body.length > 0) {
        console.log('XML snippet:', xmlRes.body.substring(0, 200));
    }
}

// Test the videos that were failing
await test('tDARtYjUiHs');  // the failing TED-style video
await test('NNOkMRw78t8');  // the other failing video
await test('Hc0aqOEU2w8');  // Maroon 5 Sugar
