import * as yt from 'youtube-transcript';
console.log(yt);

async function run() {
    console.log(await yt.YoutubeTranscript.fetchTranscript('iCSg_ul3G2w'));
}
run();
