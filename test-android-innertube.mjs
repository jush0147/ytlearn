import https from 'https';

function request(method, url, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const opts = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method,
            headers
        };
        if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
        const req = https.request(opts, (res) => {
            const chunks = [];
            res.on('data', d => chunks.push(d));
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function test() {
    const videoId = 'Hc0aqOEU2w8';
    
    // Use Innertube + HTML to get the actual signed URL
    // Key: use androidSdkVersion so YouTube gives back a proper response
    console.log('=== Fetching via Innertube (ANDROID) ===');
    const body = JSON.stringify({
        context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 34, hl: 'en', gl: 'US' } },
        videoId
    });
    const apiRes = await request('POST', 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
    }, body);
    
    const data = JSON.parse(apiRes.body);
    const status = data.playabilityStatus;
    console.log('Status:', status?.status);
    
    const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    console.log('Tracks:', tracks?.length || 0);
    if (!tracks?.length) {
        console.log('Playability:', JSON.stringify(status).substring(0, 200));
        return;
    }
    
    const enTrack = tracks.find(t => t.languageCode === 'en') || tracks[0];
    console.log('Using track:', enTrack.languageCode, 'url:', enTrack.baseUrl.substring(0, 150));
    
    // Fetch XML
    console.log('\n=== Fetching XML from Innertube URL ===');
    const xmlRes = await request('GET', enTrack.baseUrl + '&fmt=srv3', {
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
    });
    console.log('XML status:', xmlRes.status);
    console.log('XML length:', xmlRes.body.length);
    if (xmlRes.body.length > 0) console.log('XML:', xmlRes.body.substring(0, 300));
}

test().catch(console.error);
