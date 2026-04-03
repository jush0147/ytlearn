import https from 'https';

function postUrl(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'Content-Length': Buffer.byteLength(body),
          ...headers
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function testClient(name, version, extra = {}) {
  const videoId = 'iCSg_ul3G2w';
  const body = JSON.stringify({
    context: {
      client: {
        clientName: name,
        clientVersion: version,
        hl: 'en',
        gl: 'US',
        ...extra
      },
    },
    videoId,
  });

  console.log(`--- Testing ${name} / ${version} ---`);
  try {
    const res = await postUrl('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', body);
    const data = JSON.parse(res);
    const captions = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    console.log(`${name} found:`, captions?.length || 0);
  } catch(e) { console.log(`${name} err:`, e.message) }
}

async function run() {
  await testClient('WEB_EMBEDDED_PLAYER', '1.20241009.01.00');
  await testClient('MWEB', '2.20240530.07.00');
  await testClient('IOS', '19.45.4', { deviceMake: 'Apple', deviceModel: 'iPhone16,2', osName: 'iOS', osVersion: '18.1.0.22B83' });
}
run();
