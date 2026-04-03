import https from 'https';

function postUrl(url, body) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const req = https.request(
            {
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
                    'Content-Length': Buffer.byteLength(body),
                },
            },
            (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
            }
        );
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function test() {
    const videoId = 'iCSg_ul3G2w';
    const body = JSON.stringify({
        context: {
            client: {
                clientName: 'ANDROID',
                clientVersion: '20.10.38',
                androidSdkVersion: 34,
                hl: 'en',
                gl: 'US',
            },
        },
        videoId,
    });

    const res = await postUrl('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', body);
    const data = JSON.parse(res);

    const captions = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    console.log('Captions found:', captions?.length || 0);
    if (captions) {
        console.log('First track URL:', captions[0].baseUrl);
        console.log('LANG:', captions[0].languageCode);
    } else {
        console.log('Playability status:', JSON.stringify(data.playabilityStatus));
    }
}

test().catch(console.error);
