async function test() {
    try {
        const res = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                url: 'https://www.youtube.com/watch?v=iCSg_ul3G2w',
                videoQuality: '144'
            }),
        });

        console.log('Status', res.status);
        const data = await res.json();
        console.log('Data:', JSON.stringify(data).substring(0, 500));
    } catch(e) { console.error('Error', e); }
}
test();
