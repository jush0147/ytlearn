import React, { useEffect, useRef, useCallback, useState } from 'react';
import YouTube from 'react-youtube';
import type { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import { usePlayerStore } from '../stores/playerStore';
import { extractVideoId } from '../utils/helpers';
import { fetchSubtitles } from '../services/subtitleService';
import { Search, Loader2, AlertCircle } from 'lucide-react';

export const VideoPlayer: React.FC = () => {
    const {
        videoId,
        setVideoId,
        setIsPlaying,
        setCurrentTime,
        setPrimarySubtitles,
        setSecondarySubtitles,
        setActiveSubtitleIndex,
        primarySubtitles,
    } = usePlayerStore();

    const [urlInput, setUrlInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const playerRef = useRef<YouTubePlayer | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            const id = extractVideoId(urlInput);
            if (id) {
                setVideoId(id);
                setError(null);
            } else {
                setError('無法解析影片 ID，請確認網址格式');
            }
        },
        [urlInput, setVideoId]
    );

    // Fetch subtitles when video ID changes
    useEffect(() => {
        if (!videoId) return;

        setLoading(true);
        setError(null);

        fetchSubtitles(videoId)
            .then(({ primary, secondary }) => {
                setPrimarySubtitles(primary);
                setSecondarySubtitles(secondary);
            })
            .catch((err) => {
                console.warn('Subtitle fetch failed:', err);
                // Don't show error for subtitles, video can still play
            })
            .finally(() => setLoading(false));
    }, [videoId]);

    // Time tracking interval
    const startTimeTracking = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            if (playerRef.current) {
                const time = playerRef.current.getCurrentTime();
                setCurrentTime(time);

                // Find active subtitle
                const idx = primarySubtitles.findIndex(
                    (s) => time >= s.start && time < s.start + s.dur
                );
                if (idx !== -1) {
                    setActiveSubtitleIndex(idx);
                }
            }
        }, 300);
    }, [primarySubtitles, setCurrentTime, setActiveSubtitleIndex]);

    const onReady = useCallback(
        (e: YouTubeEvent) => {
            playerRef.current = e.target;
        },
        []
    );

    const onStateChange = useCallback(
        (e: YouTubeEvent) => {
            const state = e.data;
            // 1 = playing, 2 = paused
            if (state === 1) {
                setIsPlaying(true);
                startTimeTracking();
            } else {
                setIsPlaying(false);
                if (intervalRef.current) clearInterval(intervalRef.current);
            }
        },
        [setIsPlaying, startTimeTracking]
    );

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    // Expose player ref globally for seeking
    useEffect(() => {
        (window as unknown as Record<string, unknown>).__ytPlayer = playerRef;
    }, []);

    return (
        <div className="space-y-3">
            {/* URL Input */}
            <form onSubmit={handleSubmit} className="relative" id="url-input-form">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        id="youtube-url-input"
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="貼上 YouTube 網址..."
                        className="input-field pl-10 pr-20"
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium rounded-lg transition-colors"
                        id="load-video-btn"
                    >
                        載入
                    </button>
                </div>
            </form>

            {error && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl text-sm animate-fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* YouTube Player */}
            {videoId && (
                <div className="relative rounded-2xl overflow-hidden bg-black shadow-xl aspect-video animate-fade-in">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10">
                            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
                        </div>
                    )}
                    <YouTube
                        videoId={videoId}
                        opts={{
                            width: '100%',
                            height: '100%',
                            playerVars: {
                                controls: 0,
                                modestbranding: 1,
                                rel: 0,
                                fs: 0,
                                playsinline: 1,
                                iv_load_policy: 3,
                                disablekb: 1,
                            },
                        }}
                        onReady={onReady}
                        onStateChange={onStateChange}
                        className="w-full h-full"
                        iframeClassName="w-full h-full"
                    />
                </div>
            )}
        </div>
    );
};
