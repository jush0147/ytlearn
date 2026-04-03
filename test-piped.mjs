const instances = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.moomoo.me",
  "https://pipedapi.syncpundit.io",
  "https://pipedapi.smnz.de",
  "https://pipedapi.adminforge.de",
  "https://piped-api.garudalinux.org",
  "https://pipedapi.chimpy.me"
];

async function test() {
  for (const instance of instances) {
    console.log('Testing', instance);
    try {
      const res = await fetch(instance + '/streams/iCSg_ul3G2w');
      if (res.ok) {
        const data = await res.json();
        console.log(instance, 'SUCCESS - subtitles length:', data.subtitles?.length);
      } else {
        console.log(instance, 'Failed with stat:', res.status);
      }
    } catch(e) {
      console.log(instance, 'Error:', e.message);
    }
  }
}
test();
