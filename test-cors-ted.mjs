async function test() {
    try {
        const url = 'https://www.youtube.com/api/timedtext?v=iCSg_ul3G2w&lang=en&fmt=srv3&caps=asr&hl=en&ip=0.0.0.0&ipbits=0&expire=11111111111&sparams=ip,ipbits,expire,v,lang,fmt,caps,hl&signature=1111111111111111111111111111111111111111.1111111111111111111111111111111111111111&key=yt8';
        const res = await fetch('https://www.youtube.com/api/timedtext?v=iCSg_ul3G2w&lang=en&fmt=srv3&caps=asr', {
            headers: {
                'Origin': 'https://ytlearn-one.vercel.app'
            }
        });
        console.log('Status', res.status);
        console.log('Length:', (await res.text()).length);
    } catch(e) { console.error('Error', e); }
}
test();
