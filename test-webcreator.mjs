async function test() {
    const videoId = 'iCSg_ul3G2w';
    
    try {
        const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            body: JSON.stringify({
                context: {
                    client: {
                        clientName: 'WEB_CREATOR',
                        clientVersion: '1.20240321.05.00',
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
