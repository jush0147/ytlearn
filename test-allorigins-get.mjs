async function test() {
    try {
        const url = encodeURIComponent('https://www.youtube.com/watch?v=iCSg_ul3G2w');
        const res = await fetch(`https://api.allorigins.win/get?url=${url}`);
        if(res.ok) {
            const data = await res.json();
            const html = data.contents;
            console.log('HTML len', html.length);
            const idx = html.indexOf('var ytInitialPlayerResponse = ');
            console.log('Found:', idx !== -1);
            if (idx !== -1) {
                const start = idx + 'var ytInitialPlayerResponse = '.length;
                let depth = 0;
                for (let i = start; i < html.length; i++) {
                    if (html[i] === '{') depth++;
                    else if (html[i] === '}') {
                        depth--;
                        if (depth === 0) {
                            const str = html.slice(start, i + 1);
                            const json = JSON.parse(str);
                            const tracks = json.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                            console.log('Tracks:', tracks?.length);
                            break;
                        }
                    }
                }
            }
        } else {
             console.log('Failed', res.status);
        }
    } catch(e) { console.error('Error', e); }
} test();
