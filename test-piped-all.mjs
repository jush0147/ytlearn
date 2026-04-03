async function test() {
  const res = await fetch('https://raw.githubusercontent.com/TeamPiped/Piped-Instances/main/instances.json');
  const list = await res.json();
  const apiUrls = list.map(i => i.api_url);
  
  let success = 0;
  for (const url of apiUrls) {
      if (!url) continue;
      try {
        const r = await fetch(url + '/streams/iCSg_ul3G2w', { signal: AbortSignal.timeout(3000) });
        if (r.ok) {
            const data = await r.json();
            if (data.subtitles?.length) {
                console.log('SUCCESS:', url);
                success++;
                if (success >= 5) break;
            }
        }
      } catch(e) {}
  }
}
test();
