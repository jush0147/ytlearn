import React, { useEffect, useState } from 'react';
import { Play, Settings } from 'lucide-react';
import { VideoPlayer } from './components/VideoPlayer';
import { SubtitleList } from './components/SubtitleList';
import { SettingsPage } from './components/SettingsPage';
import { useThemeStore, applyTheme } from './stores/themeStore';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import type { TabId } from './types';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'player', label: '播放', icon: <Play className="w-5 h-5" /> },
    { id: 'settings', label: '設定', icon: <Settings className="w-5 h-5" /> },
];

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('player');
    const { mode } = useThemeStore();

    // Apply theme on mount and changes
    useEffect(() => {
        applyTheme(mode);

        if (mode === 'system') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = () => applyTheme('system');
            mq.addEventListener('change', handler);
            return () => mq.removeEventListener('change', handler);
        }
    }, [mode]);

    // Supabase background sync
    useSupabaseSync();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {/* Container */}
            <div className="max-w-md mx-auto relative min-h-screen flex flex-col">
                {/* Status bar spacer for PWA */}
                <div className="h-safe-top" />

                {/* Header */}
                <header className="sticky top-0 z-30 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
                    <div className="px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                                <span className="text-white text-sm font-bold">S</span>
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Shadowing</h1>
                                <p className="text-[10px] text-slate-400 dark:text-slate-600 -mt-0.5">
                                    跟讀學習
                                </p>
                            </div>
                        </div>

                        {/* Status indicators */}
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" title="Online" />
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {activeTab === 'player' && (
                        <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
                            <div className="p-4 pb-2">
                                <VideoPlayer />
                            </div>
                            <SubtitleList />
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="flex-1 overflow-y-auto p-4 animate-fade-in">
                            <SettingsPage />
                        </div>
                    )}
                </main>

                {/* Bottom Navigation */}
                <nav className="sticky bottom-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 safe-bottom">
                    <div className="flex">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200 ${activeTab === tab.id
                                        ? 'text-brand-600 dark:text-brand-400'
                                        : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
                                    }`}
                                id={`tab-${tab.id}`}
                            >
                                <div
                                    className={`transition-transform duration-200 ${activeTab === tab.id ? 'scale-110' : ''
                                        }`}
                                >
                                    {tab.icon}
                                </div>
                                <span className="text-[10px] font-medium">{tab.label}</span>
                                {activeTab === tab.id && (
                                    <div className="absolute top-0 w-8 h-0.5 bg-brand-500 rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>
                </nav>
            </div>
        </div>
    );
};

export default App;
