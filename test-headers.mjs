import https from 'https';

async function fetchUrl(url, headers = {}) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers }, (res) => {
            const chunks = [];
            res.on('data', (d) => chunks.push(d));
            res.on('end', () => resolve({
                body: Buffer.concat(chunks).toString(),
                headers: res.headers,
                status: res.statusCode
            }));
        }).on('error', reject);
    });
}

async function test() {
    const videoId = 'Hc0aqOEU2w8';
    try {
        console.log('Fetching watch page...');
        const watch = await fetchUrl(`https://www.youtube.com/watch?v=${videoId}`, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        });
        
        const marker = 'var ytInitialPlayerResponse = ';
        const idx = watch.body.indexOf(marker);
        if (idx === -1) return console.log('Marker not found');
        
        const start = idx + marker.length;
        let depth = 0;
        let playerResponse;
        for (let i = start; i < watch.body.length; i++) {
            if (watch.body[i] === '{') depth++;
            else if (watch.body[i] === '}') {
                depth--;
                if (depth === 0) {
                    playerResponse = JSON.parse(watch.body.slice(start, i + 1));
                    break;
                }
            }
        }
        
        const tracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (!tracks) return console.log('No tracks in playerResponse');
        
        const track = tracks[0];
        console.log('Found track:', track.baseUrl);
        
        // Try fetch with referer and cookies?
        const cookie = watch.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');
        
        console.log('Fetching track XML with cookies and referer...');
        const xml = await fetchUrl(track.baseUrl, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Referer': `https://www.youtube.com/watch?v=${videoId}`,
            'Cookie': cookie
        });
        
        console.log('XML Status:', xml.status);
        console.log('XML Length:', xml.body.length);
        console.log('XML Snippet:', xml.body.substring(0, 100));
        
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
