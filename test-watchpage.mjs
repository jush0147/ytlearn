const res = await fetch('https://www.youtube.com/watch?v=Hc0aqOEU2w8');
const html = await res.text();
const m = html.match(/"captionTracks":(\[.*?\])/);
if (m) {
    const tracks = JSON.parse(m[1]);
    const url = tracks[0].baseUrl;
    console.log('baseUrl snippet:', url.substring(0, 150));
    
    // Test fetching the XML from the baseUrl directly
    const r2 = await fetch(url + '&fmt=srv3', {
        headers: { 'Origin': 'https://ytlearn-one.vercel.app' }
    });
    console.log('XML status:', r2.status);
    console.log('XML cors:', r2.headers.get('access-control-allow-origin'));
    const xml = await r2.text();
    console.log('XML length:', xml.length);
    if (xml.length > 0) console.log('XML snippet:', xml.substring(0, 200));
}
