async function test() {
    try {
        const u = encodeURIComponent('https://www.youtube.com/watch?v=iCSg_ul3G2w');
        const res = await fetch(`https://translate.google.com/website?sl=en&tl=en&u=${u}`);
        const html = await res.text();
        console.log('Len', html.length);
        const marker = 'var ytInitialPlayerResponse = ';
        const idx = html.indexOf(marker);
        console.log('Found:', idx !== -1);
    } catch(e){ console.error(e) }
}
test();
