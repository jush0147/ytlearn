import { create } from 'zustand';
import type { PlayerState } from '../types';

export const usePlayerStore = create<PlayerState>()((set) => ({
    videoId: null,
    isPlaying: false,
    currentTime: 0,
    primarySubtitles: [],
    secondarySubtitles: [],
    activeSubtitleIndex: -1,
    setVideoId: (id) => set({ videoId: id, primarySubtitles: [], secondarySubtitles: [], activeSubtitleIndex: -1 }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setCurrentTime: (time) => set({ currentTime: time }),
    setPrimarySubtitles: (subs) => set({ primarySubtitles: subs }),
    setSecondarySubtitles: (subs) => set({ secondarySubtitles: subs }),
    setActiveSubtitleIndex: (index) => set({ activeSubtitleIndex: index }),
}));
