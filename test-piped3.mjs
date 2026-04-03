const urls = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.nosebs.ru',
  'https://pipedapi-libre.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.drgns.space',
  'https://pipedapi.owo.si',
  'https://pipedapi.ducks.party',
  'https://pipedapi.reallyaweso.me',
  'https://pipedapi.darkness.services',
  'https://pipedapi.orangenet.cc'
];
async function test() {
  for (const url of urls) {
      console.log('Testing', url);
      try {
        const r = await fetch(url + '/streams/iCSg_ul3G2w', { signal: AbortSignal.timeout(3000) });
        if (r.ok) {
            const data = await r.json();
            if (data.subtitles?.length) {
                console.log('SUCCESS:', url, data.subtitles.length, 'tracks');
                const enSub = data.subtitles.find(s=>s.code.startsWith('en'));
                if (enSub) {
                    const xml = await (await fetch(enSub.url)).text();
                    console.log('XML length', xml.length);
                }
            } else {
                console.log('No subs.');
            }
        }
      } catch(e) { console.log('Err', e.message); }
  }
}
test();
