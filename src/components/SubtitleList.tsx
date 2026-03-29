import React, { useRef, useEffect, useCallback, useState } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useVocabStore } from '../stores/vocabStore';
import { tokenizeWords, formatTime } from '../utils/helpers';
import type { SubtitleSegment } from '../types';
import { BottomSheet } from './BottomSheet';
import { ShadowingRecorder } from './ShadowingRecorder';

export const SubtitleList: React.FC = () => {
    const { primarySubtitles, secondarySubtitles, activeSubtitleIndex } = usePlayerStore();
    const { getWordStatus } = useVocabStore();
    const listRef = useRef<HTMLDivElement>(null);
    const activeRef = useRef<HTMLDivElement>(null);
    const [selectedWord, setSelectedWord] = useState<{ word: string; sentence: string } | null>(null);
    const [recordingSentence, setRecordingSentence] = useState<string | null>(null);

    // Auto-scroll to active subtitle
    useEffect(() => {
        if (activeRef.current && listRef.current) {
            activeRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [activeSubtitleIndex]);

    const handleSeek = useCallback((segment: SubtitleSegment) => {
        const playerRef = (window as unknown as Record<string, { current: { seekTo: (t: number, b: boolean) => void; playVideo: () => void } | null }>).__ytPlayer;
        if (playerRef?.current) {
            playerRef.current.seekTo(segment.start, true);
            playerRef.current.playVideo();
        }
    }, []);

    const handleWordClick = useCallback((e: React.MouseEvent, word: string, sentence: string) => {
        e.stopPropagation();
        // Pause video
        const playerRef = (window as unknown as Record<string, { current: { pauseVideo: () => void } | null }>).__ytPlayer;
        if (playerRef?.current) {
            playerRef.current.pauseVideo();
        }
        setSelectedWord({ word, sentence });
    }, []);

    const handleRecordClick = useCallback((sentence: string) => {
        // Pause video
        const playerRef = (window as unknown as Record<string, { current: { pauseVideo: () => void } | null }>).__ytPlayer;
        if (playerRef?.current) {
            playerRef.current.pauseVideo();
        }
        setRecordingSentence(sentence);
    }, []);

    // Find matching secondary subtitle
    const findSecondary = useCallback(
        (primary: SubtitleSegment) => {
            return secondarySubtitles.find(
                (s) =>
                    Math.abs(s.start - primary.start) < 1.5 ||
                    (s.start <= primary.start + primary.dur && s.start + s.dur >= primary.start)
            );
        },
        [secondarySubtitles]
    );

    if (primarySubtitles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
                <div className="text-5xl mb-4">📝</div>
                <p className="text-sm">載入影片後字幕將顯示在這裡</p>
            </div>
        );
    }

    return (
        <>
            <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-hide pb-20 space-y-1 px-2">
                {primarySubtitles.map((segment, index) => {
                    const isActive = index === activeSubtitleIndex;
                    const secondary = findSecondary(segment);
                    const words = tokenizeWords(segment.text);

                    return (
                        <div
                            key={`${segment.start}-${index}`}
                            ref={isActive ? activeRef : undefined}
                            className={`subtitle-line group ${isActive ? 'subtitle-line-active' : ''}`}
                            onClick={() => handleSeek(segment)}
                            id={`subtitle-${index}`}
                        >
                            {/* Time badge */}
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {formatTime(segment.start)}
                                </span>
                                {isActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse-soft" />
                                )}
                            </div>

                            {/* Primary subtitle with word-level rendering */}
                            <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 leading-relaxed text-[15px]">
                                {words.map((w, wi) => {
                                    const status = getWordStatus(w.clean);
                                    return (
                                        <span
                                            key={`${w.original}-${wi}`}
                                            className={`cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95 ${status === 'learning'
                                                    ? 'word-learning'
                                                    : status === 'mastered'
                                                        ? 'word-mastered'
                                                        : 'word-unmarked'
                                                }`}
                                            onClick={(e) => handleWordClick(e, w.clean, segment.text)}
                                        >
                                            {w.original}
                                        </span>
                                    );
                                })}
                            </div>

                            {/* Secondary subtitle (translation) */}
                            {secondary && (
                                <p className="text-xs text-slate-400 dark:text-slate-600 mt-1 leading-relaxed">
                                    {secondary.text}
                                </p>
                            )}

                            {/* Shadowing button (visible on active or hover) */}
                            <div className={`mt-2 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRecordClick(segment.text);
                                    }}
                                    className="text-xs px-3 py-1 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg hover:bg-brand-500/20 transition-colors"
                                    id={`shadow-btn-${index}`}
                                >
                                    🎤 跟讀
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Word Analysis Bottom Sheet */}
            {selectedWord && (
                <BottomSheet
                    word={selectedWord.word}
                    sentence={selectedWord.sentence}
                    onClose={() => setSelectedWord(null)}
                />
            )}

            {/* Shadowing Recorder */}
            {recordingSentence && (
                <ShadowingRecorder
                    sentence={recordingSentence}
                    onClose={() => setRecordingSentence(null)}
                />
            )}
        </>
    );
};
