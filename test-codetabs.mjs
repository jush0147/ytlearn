async function test() {
    try {
        const url = encodeURIComponent('https://www.youtube.com/watch?v=iCSg_ul3G2w');
        const res = await fetch(`https://api.codetabs.com/v1/proxy/?quest=${url}`);
        if(res.ok) {
            const html = await res.text();
            console.log('HTML len', html.length);
        } else {
             console.log('Failed', res.status);
        }
    } catch(e) { console.error('Error', e); }
} test();
