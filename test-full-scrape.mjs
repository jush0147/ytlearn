import https from 'https';

async function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
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
                    const data = JSON.parse(html.slice(start, i + 1));
                    const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                    console.log('Tracks:', tracks?.length || 0);
                    if (tracks) {
                        const track = tracks[0];
                        console.log('Fetching track', track.baseUrl);
                        const xml = await fetchUrl(track.baseUrl);
                        console.log('XML Length', xml.length);
                        console.log('XML snippet', xml.substring(0, 500));
                        found = true;
                    }
                    break;
                }
            }
        }
        if (!found) console.log('Could not find or fetch captions');
    } catch (e) {
        console.error('Test error:', e);
    }
}

test();
