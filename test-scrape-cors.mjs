async function test() {
    const videoId = 'iCSg_ul3G2w';
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(ytUrl)}`;
    
    console.log('Fetching', proxyUrl);
    
    try {
        const res = await fetch(proxyUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        console.log('Status:', res.status);
        const html = await res.text();
        
        const marker = 'var ytInitialPlayerResponse = ';
        const idx = html.indexOf(marker);
        if (idx !== -1) {
            console.log("Found player response!");
        } else {
            console.log("Not found.");
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

test();
