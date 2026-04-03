import https from 'https';

async function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        }, (res) => {
            const chunks = [];
            res.on('data', (d) => chunks.push(d));
            res.on('end', () => resolve(Buffer.concat(chunks).toString()));
        }).on('error', reject);
    });
}

async function test() {
    const videoId = 'Hc0aqOEU2w8';
    try {
        const html = await fetchUrl(`https://www.youtube.com/watch?v=${videoId}`);
        console.log('HTML Length:', html.length);
        
        const marker = 'var ytInitialPlayerResponse = ';
        const idx = html.indexOf(marker);
        if (idx === -1) {
            console.log('Marker not found');
            return;
        }
        
        const start = idx + marker.length;
        let depth = 0;
        let found = false;
        for (let i = start; i < html.length; i++) {
            if (html[i] === '{') depth++;
            else if (html[i] === '}') {
                depth--;
                if (depth === 0) {
                    try {
                        const data = JSON.parse(html.slice(start, i + 1));
                        const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                        console.log('Caption tracks found:', tracks?.length || 0);
                        if (tracks) console.log('First track:', JSON.stringify(tracks[0], null, 2));
                        found = true;
                    } catch (e) {
                        console.log('JSON Parse Error at end', i);
                    }
                    break;
                }
            }
        }
        if (!found) console.log('Could not parse JSON');
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

test();
