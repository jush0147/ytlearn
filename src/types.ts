export type VocabStatus = 'unmarked' | 'learning' | 'mastered';

export interface VocabEntry {
    word: string;
    status: VocabStatus;
    updated_at: string;
}

export interface SubtitleSegment {
    start: number;
    dur: number;
    text: string;
}

export interface SubtitleTrack {
    languageCode: string;
    languageName: string;
    segments: SubtitleSegment[];
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type TabId = 'player' | 'settings';

export interface GeminiWordAnalysis {
    word: string;
    phonetic: string;
    partOfSpeech: string;
    contextMeaning: string;
    liaisionTip?: string;
    examples?: string[];
}

export interface PronunciationScore {
    accuracyScore: number;
    fluencyScore: number;
    completenessScore: number;
    pronunciationScore: number;
    words?: PronunciationWordScore[];
}

export interface PronunciationWordScore {
    word: string;
    accuracyScore: number;
    errorType: string;
}

export interface SettingsState {
    supabaseUrl: string;
    supabaseAnonKey: string;
    geminiApiKey: string;
    azureApiKey: string;
    azureRegion: string;
    setSupabaseUrl: (url: string) => void;
    setSupabaseAnonKey: (key: string) => void;
    setGeminiApiKey: (key: string) => void;
    setAzureApiKey: (key: string) => void;
    setAzureRegion: (region: string) => void;
}

export interface VocabState {
    vocab: Record<string, VocabEntry>;
    pendingSync: string[];
    setWordStatus: (word: string, status: VocabStatus) => void;
    getWordStatus: (word: string) => VocabStatus;
    loadFromSupabase: (entries: VocabEntry[]) => void;
    clearPendingSync: () => void;
}

export interface PlayerState {
    videoId: string | null;
    isPlaying: boolean;
    currentTime: number;
    primarySubtitles: SubtitleSegment[];
    secondarySubtitles: SubtitleSegment[];
    activeSubtitleIndex: number;
    setVideoId: (id: string | null) => void;
    setIsPlaying: (playing: boolean) => void;
    setCurrentTime: (time: number) => void;
    setPrimarySubtitles: (subs: SubtitleSegment[]) => void;
    setSecondarySubtitles: (subs: SubtitleSegment[]) => void;
    setActiveSubtitleIndex: (index: number) => void;
}

export interface ThemeState {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
}
