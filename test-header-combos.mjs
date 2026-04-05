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
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf-8') }));
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
        if (body) req.write(body);
        req.end();
    });
}

async function test(videoId) {
    console.log(`\n=== Testing ${videoId} ===`);
    
    // Get HTML with browser UA - same cookies as watch page
    const htmlRes = await httpsRequest('GET', `https://www.youtube.com/watch?v=${videoId}`, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
    });
    
    const cookies = htmlRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || '';

    const m = htmlRes.body.match(/"captionTracks":(\[.*?\])/);
    if (!m) { console.log('No captionTracks in HTML'); return; }
    
    const tracks = JSON.parse(m[1]);
    const enTrack = tracks.find(t => t.languageCode === 'en') || tracks[0];
    console.log(`Track: ${enTrack.languageCode} (${enTrack.kind || 'manual'})`);
    console.log('URL snippet:', enTrack.baseUrl.substring(0, 100));
    
    // Test with different combinations
    const tests = [
        { label: 'Android UA only', headers: { 'User-Agent': ANDROID_UA } },
        { label: 'Android UA + Cookie', headers: { 'User-Agent': ANDROID_UA, 'Cookie': cookies } },
        { label: 'Android UA + Referer', headers: { 'User-Agent': ANDROID_UA, 'Referer': `https://www.youtube.com/watch?v=${videoId}` } },
        { label: 'Android UA + Cookie + Referer', headers: { 'User-Agent': ANDROID_UA, 'Cookie': cookies, 'Referer': `https://www.youtube.com/watch?v=${videoId}` } },
        { label: 'Browser UA + Cookie', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Cookie': cookies } },
    ];
    
    for (const test of tests) {
        const xmlRes = await httpsRequest('GET', enTrack.baseUrl + '&fmt=srv3', test.headers);
        console.log(`  ${test.label}: status=${xmlRes.status} length=${xmlRes.body.length}`);
    }
}

await test('tDARtYjUiHs');
