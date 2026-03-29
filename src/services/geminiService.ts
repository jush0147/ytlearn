import type { GeminiWordAnalysis } from '../types';

/**
 * Call Gemini Flash Lite for context-aware word analysis
 */
export async function analyzeWord(
    apiKey: string,
    word: string,
    sentence: string
): Promise<GeminiWordAnalysis> {
    const prompt = `You are a language learning assistant. Analyze the word "${word}" in the context of this sentence:

"${sentence}"

Return a JSON object with these fields:
- "word": the word being analyzed
- "phonetic": IPA phonetic transcription
- "partOfSpeech": part of speech (noun, verb, adjective, etc.)
- "contextMeaning": the precise meaning of this word IN THIS SPECIFIC CONTEXT, explained in Traditional Chinese (繁體中文)
- "liaisionTip": if there are any connected speech patterns (linking, elision, assimilation) between this word and adjacent words in the sentence, describe them; otherwise null
- "examples": 2 short example sentences using the word with similar meaning

Return ONLY valid JSON, no markdown formatting.`;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 500,
                    responseMimeType: 'application/json',
                },
            }),
        }
    );

    if (!res.ok) {
        throw new Error(`Gemini API failed: ${res.statusText}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error('No response from Gemini');
    }

    return JSON.parse(text);
}
