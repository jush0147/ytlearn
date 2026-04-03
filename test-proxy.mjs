async function test() {
    const videoId = 'iCSg_ul3G2w';
    const inntertubeUrl = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
    const proxyUrl = `https://ytlearn-one.vercel.app/api/proxy?url=${encodeURIComponent(inntertubeUrl)}`;
    
    console.log('Fetching', proxyUrl);
    
    try {
        const res = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Custom-UA': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            body: JSON.stringify({
                context: {
                    client: {
                        clientName: 'IOS',
                        clientVersion: '19.29.1',
                        deviceMake: 'Apple',
                        deviceModel: 'iPhone16,2',
                        osName: 'iOS',
                        osVersion: '17.5.1.21F90',
                        hl: 'en',
                        gl: 'US',
                    },
                },
                videoId,
            }),
        });

        console.log('Status:', res.status);
        const data = await res.json();
        const captions = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        console.log('Captions found:', captions?.length || 0);
        if (captions && captions.length > 0) {
            console.log('First caption track URL:', captions[0].baseUrl);
        } else {
             console.log('Playability status:', JSON.stringify(data.playabilityStatus));
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

test();
