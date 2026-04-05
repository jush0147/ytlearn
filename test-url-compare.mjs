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

async function getInnertubeUrl(videoId) {
    const body = JSON.stringify({
        context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 34, hl: 'en', gl: 'US' } },
        videoId
    });
    const res = await httpsRequest('POST', 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
        { 'Content-Type': 'application/json', 'User-Agent': ANDROID_UA }, body);
    const data = JSON.parse(res.body);
    return data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
}

async function getHtmlUrl(videoId) {
    const res = await httpsRequest('GET', `https://www.youtube.com/watch?v=${videoId}`, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
    });
    const m = res.body.match(/"captionTracks":(\[.*?\])/);
    if (!m) return null;
    return JSON.parse(m[1]);
}

async function test(videoId) {
    console.log(`\n=== ${videoId} ===`);
    
    const [innTracks, htmlTracks] = await Promise.all([
        getInnertubeUrl(videoId).catch(() => null),
        getHtmlUrl(videoId).catch(() => null)
    ]);
    
    const enInn = innTracks?.find(t => t.languageCode === 'en') || innTracks?.[0];
    const enHtml = htmlTracks?.find(t => t.languageCode === 'en') || htmlTracks?.[0];
    
    console.log('Innertube URL:', enInn?.baseUrl?.substring(0, 80));
    console.log('HTML URL:     ', enHtml?.baseUrl?.substring(0, 80));
    
    // Compare the two URLs - are they the same signature structure?
    if (enInn && enHtml) {
        console.log('\nInnertube has exp param:', enInn.baseUrl.includes('exp='));
        console.log('HTML has exp param:', enHtml.baseUrl.includes('exp='));
        
        // Try fetching innertube URL with Android headers
        const xml = await httpsRequest('GET', enInn.baseUrl + '&fmt=srv3', { 'User-Agent': ANDROID_UA });
        console.log('Innertube XML length:', xml.body.length);
        
        // Try fetching HTML URL with Android headers
        const xml2 = await httpsRequest('GET', enHtml.baseUrl + '&fmt=srv3', { 'User-Agent': ANDROID_UA });
        console.log('HTML XML length:', xml2.body.length);
    }
}

// tDARtYjUiHs was failing - is it age restricted or something?
await test('tDARtYjUiHs');
await test('NNOkMRw78t8');
