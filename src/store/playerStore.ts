import { create } from 'zustand';
import { SubtitleCue } from '../types/subtitle';

export type SubtitleLoadState = 'idle' | 'loading' | 'loaded' | 'unavailable';

type PlayerStore = {
  videoId: string | null;
  subtitles: SubtitleCue[];
  subtitleState: SubtitleLoadState;
  activeSubtitleIndex: number;
  currentTime: number;
  setVideoId: (videoId: string | null) => void;
  setSubtitles: (subtitles: SubtitleCue[]) => void;
  setSubtitleState: (state: SubtitleLoadState) => void;
  setActiveSubtitleIndex: (index: number) => void;
  setCurrentTime: (time: number) => void;
  resetPlaybackSync: () => void;
};

export const usePlayerStore = create<PlayerStore>((set) => ({
  videoId: null,
  subtitles: [],
  subtitleState: 'idle',
  activeSubtitleIndex: -1,
  currentTime: 0,
  setVideoId: (videoId) => set({ videoId }),
  setSubtitles: (subtitles) => set({ subtitles }),
  setSubtitleState: (subtitleState) => set({ subtitleState }),
  setActiveSubtitleIndex: (activeSubtitleIndex) => set({ activeSubtitleIndex }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  resetPlaybackSync: () => set({ activeSubtitleIndex: -1, currentTime: 0 }),
}));
