import YoutubeTranscript from 'youtube-transcript';

async function test() {
    try {
        const transcript = await YoutubeTranscript.fetchTranscript('iCSg_ul3G2w');
        console.log('SUCCESS:', transcript.length, 'segments');
    } catch(e) {
        console.log('FAILED:', e.message);
    }
}
test();
