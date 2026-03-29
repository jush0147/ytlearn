import React, { useEffect, useState } from 'react';
import { X, BookOpen, CheckCircle2, Loader2 } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { useVocabStore } from '../stores/vocabStore';
import { analyzeWord } from '../services/geminiService';
import type { GeminiWordAnalysis, VocabStatus } from '../types';

interface Props {
    word: string;
    sentence: string;
    onClose: () => void;
}

export const BottomSheet: React.FC<Props> = ({ word, sentence, onClose }) => {
    const { geminiApiKey } = useSettingsStore();
    const { getWordStatus, setWordStatus } = useVocabStore();
    const [analysis, setAnalysis] = useState<GeminiWordAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentStatus = getWordStatus(word);

    useEffect(() => {
        if (!geminiApiKey) {
            setError('請先在設定頁面輸入 Gemini API Key');
            return;
        }

        setLoading(true);
        setError(null);

        analyzeWord(geminiApiKey, word, sentence)
            .then(setAnalysis)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [word, sentence, geminiApiKey]);

    const handleStatusChange = (status: VocabStatus) => {
        setWordStatus(word, status);
    };

    return (
        <>
            {/* Overlay */}
            <div className="bottom-sheet-overlay animate-fade-in" onClick={onClose} />

            {/* Sheet */}
            <div className="bottom-sheet animate-slide-up safe-bottom" id="word-analysis-sheet">
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-semibold capitalize">{word}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        id="close-sheet-btn"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {loading && (
                        <div className="flex flex-col items-center py-8 gap-3">
                            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                            <p className="text-sm text-slate-500">AI 分析中...</p>
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-8">
                            <p className="text-sm text-red-500">{error}</p>
                        </div>
                    )}

                    {analysis && !loading && (
                        <>
                            {/* Phonetic & POS */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                                    {analysis.phonetic}
                                </span>
                                <span className="px-2 py-0.5 text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full font-medium">
                                    {analysis.partOfSpeech}
                                </span>
                            </div>

                            {/* Context Meaning */}
                            <div className="glass-card-solid p-4">
                                <p className="text-xs text-slate-400 mb-1.5 font-medium">語境釋義</p>
                                <p className="text-sm leading-relaxed">{analysis.contextMeaning}</p>
                            </div>

                            {/* Liaison Tip */}
                            {analysis.liaisionTip && (
                                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4">
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-1.5 font-medium">
                                        🔗 連音提示
                                    </p>
                                    <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                                        {analysis.liaisionTip}
                                    </p>
                                </div>
                            )}

                            {/* Examples */}
                            {analysis.examples && analysis.examples.length > 0 && (
                                <div>
                                    <p className="text-xs text-slate-400 mb-2 font-medium">例句</p>
                                    <div className="space-y-2">
                                        {analysis.examples.map((ex, i) => (
                                            <p
                                                key={i}
                                                className="text-sm text-slate-600 dark:text-slate-400 pl-3 border-l-2 border-slate-200 dark:border-slate-700"
                                            >
                                                {ex}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Context sentence */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                                <p className="text-xs text-slate-400 mb-1">原句</p>
                                <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{sentence}"</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Status buttons */}
                <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                    <button
                        onClick={() => handleStatusChange('learning')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${currentStatus === 'learning'
                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                                : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40'
                            }`}
                        id="mark-learning-btn"
                    >
                        <BookOpen className="w-4 h-4" />
                        正在學
                    </button>
                    <button
                        onClick={() => handleStatusChange('mastered')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${currentStatus === 'mastered'
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40'
                            }`}
                        id="mark-mastered-btn"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        已學會
                    </button>
                </div>
            </div>
        </>
    );
};
