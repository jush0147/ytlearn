async function test() {
    try {
        const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://ytlearn-one.vercel.app',
                'Access-Control-Request-Method': 'POST'
            }
        });
        console.log('Status', res.status);
        console.log('CORS Allow Origin:', res.headers.get('Access-Control-Allow-Origin'));
    } catch(e) { console.error('Error', e); }
}
test();
