import React, { useState, useRef, useCallback } from 'react';
import { X, Mic, Square, Loader2 } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { assessPronunciation, createAudioRecorder } from '../services/azureService';
import type { PronunciationScore } from '../types';

interface Props {
    sentence: string;
    onClose: () => void;
}

const ScoreRing: React.FC<{ score: number; label: string; size?: number }> = ({
    score,
    label,
    size = 72,
}) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const getColor = (s: number) => {
        if (s >= 80) return '#22c55e';
        if (s >= 60) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="score-ring" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-slate-200 dark:text-slate-700"
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={getColor(score)}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    />
                </svg>
                <span className="absolute text-sm font-bold" style={{ color: getColor(score) }}>
                    {Math.round(score)}
                </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{label}</span>
        </div>
    );
};

export const ShadowingRecorder: React.FC<Props> = ({ sentence, onClose }) => {
    const { azureApiKey, azureRegion } = useSettingsStore();
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const [score, setScore] = useState<PronunciationScore | null>(null);
    const [error, setError] = useState<string | null>(null);
    const recorderRef = useRef(createAudioRecorder());

    const handleRecord = useCallback(async () => {
        if (!azureApiKey || !azureRegion) {
            setError('請先在設定頁面輸入 Azure API Key 和 Region');
            return;
        }

        if (isRecording) {
            // Stop recording
            setIsRecording(false);
            setLoading(true);
            setError(null);

            try {
                const audioBlob = await recorderRef.current.stop();
                const result = await assessPronunciation(azureApiKey, azureRegion, audioBlob, sentence);
                setScore(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Assessment failed');
            } finally {
                setLoading(false);
            }
        } else {
            // Start recording
            try {
                setScore(null);
                setError(null);
                recorderRef.current = createAudioRecorder();
                await recorderRef.current.start();
                setIsRecording(true);
            } catch (err) {
                setError('無法存取麥克風，請確認權限設定');
            }
        }
    }, [isRecording, azureApiKey, azureRegion, sentence]);

    return (
        <>
            <div className="bottom-sheet-overlay animate-fade-in" onClick={onClose} />

            <div className="bottom-sheet animate-slide-up safe-bottom" id="shadowing-sheet">
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-semibold">🎤 跟讀評分</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-5">
                    {/* Reference sentence */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                        <p className="text-xs text-slate-400 mb-1.5">參考句</p>
                        <p className="text-sm leading-relaxed font-medium">{sentence}</p>
                    </div>

                    {/* Record button */}
                    <div className="flex justify-center">
                        <button
                            onClick={handleRecord}
                            disabled={loading}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording
                                    ? 'bg-red-500 shadow-xl shadow-red-500/30 animate-pulse-soft scale-110'
                                    : loading
                                        ? 'bg-slate-300 dark:bg-slate-700'
                                        : 'bg-gradient-to-br from-brand-500 to-brand-600 shadow-xl shadow-brand-500/30 hover:scale-105 active:scale-95'
                                }`}
                            id="record-btn"
                        >
                            {loading ? (
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            ) : isRecording ? (
                                <Square className="w-7 h-7 text-white fill-white" />
                            ) : (
                                <Mic className="w-8 h-8 text-white" />
                            )}
                        </button>
                    </div>

                    <p className="text-center text-xs text-slate-400">
                        {isRecording ? '錄音中... 點擊停止' : loading ? '分析中...' : '點擊開始錄音'}
                    </p>

                    {error && (
                        <p className="text-center text-sm text-red-500">{error}</p>
                    )}

                    {/* Score Card */}
                    {score && (
                        <div className="space-y-4 animate-fade-in">
                            {/* Overall score */}
                            <div className="flex justify-center">
                                <ScoreRing score={score.pronunciationScore} label="總分" size={96} />
                            </div>

                            {/* Detailed scores */}
                            <div className="flex justify-center gap-6">
                                <ScoreRing score={score.accuracyScore} label="準確度" />
                                <ScoreRing score={score.fluencyScore} label="流暢度" />
                                <ScoreRing score={score.completenessScore} label="完整度" />
                            </div>

                            {/* Word-level results */}
                            {score.words && score.words.length > 0 && (
                                <div>
                                    <p className="text-xs text-slate-400 mb-2 font-medium">逐字評分</p>
                                    <div className="flex flex-wrap gap-2">
                                        {score.words.map((w, i) => (
                                            <span
                                                key={i}
                                                className={`px-2 py-1 rounded-lg text-xs font-medium ${w.errorType === 'None'
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                                                        : w.errorType === 'Omission'
                                                            ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 line-through'
                                                            : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                                                    }`}
                                            >
                                                {w.word}
                                                {w.errorType !== 'None' && (
                                                    <span className="ml-1 opacity-60 text-[10px]">{w.errorType}</span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
