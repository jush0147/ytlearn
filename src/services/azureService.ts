import type { PronunciationScore } from '../types';

/**
 * Send audio to Azure Speech Services for pronunciation assessment
 */
export async function assessPronunciation(
    apiKey: string,
    region: string,
    audioBlob: Blob,
    referenceText: string
): Promise<PronunciationScore> {
    const pronAssessmentParams = {
        ReferenceText: referenceText,
        GradingSystem: 'HundredMark',
        Granularity: 'Word',
        Dimension: 'Comprehensive',
        EnableMiscue: true,
    };

    const encodedParams = btoa(JSON.stringify(pronAssessmentParams));

    const res = await fetch(
        `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`,
        {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': apiKey,
                'Pronunciation-Assessment': encodedParams,
                'Content-Type': 'audio/wav',
                'Accept': 'application/json',
            },
            body: audioBlob,
        }
    );

    if (!res.ok) {
        throw new Error(`Azure Speech API failed: ${res.statusText}`);
    }

    const data = await res.json();
    const nBest = data.NBest?.[0];

    if (!nBest) {
        throw new Error('No pronunciation assessment result');
    }

    const pronAssessment = nBest.PronunciationAssessment;

    return {
        accuracyScore: pronAssessment?.AccuracyScore ?? 0,
        fluencyScore: pronAssessment?.FluencyScore ?? 0,
        completenessScore: pronAssessment?.CompletenessScore ?? 0,
        pronunciationScore: pronAssessment?.PronScore ?? 0,
        words: nBest.Words?.map((w: { Word: string; PronunciationAssessment: { AccuracyScore: number; ErrorType: string } }) => ({
            word: w.Word,
            accuracyScore: w.PronunciationAssessment?.AccuracyScore ?? 0,
            errorType: w.PronunciationAssessment?.ErrorType ?? 'None',
        })),
    };
}

/**
 * Record audio via MediaRecorder and return WAV blob
 */
export function createAudioRecorder(): {
    start: () => Promise<void>;
    stop: () => Promise<Blob>;
    isRecording: () => boolean;
} {
    let mediaRecorder: MediaRecorder | null = null;
    let chunks: Blob[] = [];
    let recording = false;

    return {
        start: async () => {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });

            chunks = [];
            mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : 'audio/webm',
            });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.start();
            recording = true;
        },

        stop: () => {
            return new Promise((resolve, reject) => {
                if (!mediaRecorder) return reject(new Error('No recorder'));

                mediaRecorder.onstop = async () => {
                    recording = false;
                    const webmBlob = new Blob(chunks, { type: 'audio/webm' });
                    // Convert to WAV for Azure
                    try {
                        const wavBlob = await convertToWav(webmBlob);
                        resolve(wavBlob);
                    } catch {
                        // Fallback: send as-is
                        resolve(webmBlob);
                    }
                    // Stop all tracks
                    mediaRecorder?.stream.getTracks().forEach((t) => t.stop());
                };

                mediaRecorder.stop();
            });
        },

        isRecording: () => recording,
    };
}

/**
 * Convert audio blob to WAV format using AudioContext
 */
async function convertToWav(blob: Blob): Promise<Blob> {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const numChannels = 1;
    const sampleRate = 16000;
    const bitsPerSample = 16;
    const numSamples = audioBuffer.length;
    const dataLength = numSamples * numChannels * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Write audio data
    const channelData = audioBuffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
    }

    audioContext.close();
    return new Blob([buffer], { type: 'audio/wav' });
}
