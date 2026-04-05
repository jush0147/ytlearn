import https from 'https';

function get(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        https.request({
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                ...headers
            }
        }, (res) => {
            const chunks = [];
            res.on('data', d => chunks.push(d));
            res.on('end', () => resolve({
                status: res.statusCode,
                headers: res.headers,
                body: Buffer.concat(chunks).toString('utf-8')
            }));
        }).on('error', reject).end();
    });
}

async function test() {
    // Step 1: Get watch page WITH cookie session
    console.log('=== Fetching watch page ===');
    const watchRes = await get('https://www.youtube.com/watch?v=Hc0aqOEU2w8');
    const cookies = watchRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || '';
    console.log('Cookies received:', cookies.substring(0, 100));

    const m = watchRes.body.match(/"captionTracks":(\[.*?\])/);
    if (!m) { console.log('No captionTracks!'); return; }
    const tracks = JSON.parse(m[1]);
    console.log('Tracks:', tracks.length);

    const enTrack = tracks.find(t => t.languageCode === 'en') || tracks[0];
    console.log('Using track:', enTrack.languageCode, enTrack.kind || 'manual');
    console.log('baseUrl:', enTrack.baseUrl.substring(0, 150));

    // Step 2: Fetch XML using the SAME cookies from watch page session
    console.log('\n=== Fetching XML with session cookies ===');
    const xmlRes = await get(enTrack.baseUrl + '&fmt=srv3', {
        'Cookie': cookies,
        'Referer': 'https://www.youtube.com/watch?v=Hc0aqOEU2w8',
    });
    console.log('XML status:', xmlRes.status);
    console.log('XML content-type:', xmlRes.headers['content-type']);
    console.log('XML length:', xmlRes.body.length);
    if (xmlRes.body.length > 0) console.log('XML snippet:', xmlRes.body.substring(0, 300));

    // Step 3: Try without fmt
    console.log('\n=== Fetching XML without fmt ===');
    const xmlRes2 = await get(enTrack.baseUrl, {
        'Cookie': cookies,
        'Referer': 'https://www.youtube.com/watch?v=Hc0aqOEU2w8',
    });
    console.log('XML2 status:', xmlRes2.status);
    console.log('XML2 length:', xmlRes2.body.length);
    if (xmlRes2.body.length > 0) console.log('XML2 snippet:', xmlRes2.body.substring(0, 300));
}

test().catch(console.error);
