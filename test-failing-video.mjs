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
            res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

// Test with the failing video
const videoId = 'tDARtYjUiHs';
const body = JSON.stringify({
    context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 34, hl: 'en', gl: 'US' } },
    videoId
});
const res = await httpsRequest('POST', 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
    { 'Content-Type': 'application/json', 'User-Agent': ANDROID_UA }, body);
const data = JSON.parse(res.body);
console.log('Status:', data.playabilityStatus?.status);
const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
console.log('Tracks:', tracks?.length || 0);
if (tracks?.length) {
    const xml = await httpsRequest('GET', tracks[0].baseUrl + '&fmt=srv3', { 'User-Agent': ANDROID_UA });
    console.log('XML length:', xml.body.length);
} else {
    console.log('Reason:', data.playabilityStatus?.reason);
}
