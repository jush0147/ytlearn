async function test() {
    const res = await fetch('https://youtubetranscript.com/?server_vid2=iCSg_ul3G2w');
    if (res.ok) {
        const text = await res.text();
        console.log('Success!', text.substring(0, 200));
    } else {
        console.log('Failed', res.status);
    }
}
test();
