async function test() {
    try {
        const res = await fetch('https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=en&fmt=srv3', {
            headers: {
                'Origin': 'https://ytlearn-one.vercel.app'
            }
        });
        console.log('Status', res.status);
        console.log('CORS Headers:', res.headers.get('Access-Control-Allow-Origin'));
    } catch(e) { console.error('Error', e); }
}
test();
