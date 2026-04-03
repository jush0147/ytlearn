async function test() {
    try {
        const res = await fetch('https://www.youtube.com/api/timedtext?v=iCSg_ul3G2w&type=list', {
            headers: {
                'Origin': 'https://ytlearn-one.vercel.app'
            }
        });
        console.log('Status', res.status);
        console.log('Body', await res.text());
    } catch(e) { console.error(e) }
}
test();
