import https from 'https';

process.on('warning', (warning) => {
    if (warning.name === 'DeprecationWarning' && warning.message.includes('url.parse')) {
        console.error('=== url.parse call stack ===');
        console.error(warning.stack);
    }
});

const resolve = (url) => new Promise((res) => {
    https.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (r) => {
        const c = [];
        r.on('data', d => c.push(d));
        r.on('end', () => res(Buffer.concat(c).toString()));
    });
});

const html = await resolve('https://www.youtube.com/watch?v=Hc0aqOEU2w8');
const m = html.match(/"captionTracks":(\[.*?\])/);
if (m) {
    const tracks = JSON.parse(m[1]);
    console.log('Track URL:', tracks[0].baseUrl.substring(0, 80));
    const xml = await resolve(tracks[0].baseUrl + '&fmt=srv3');
    console.log('XML length:', xml.length);
}
