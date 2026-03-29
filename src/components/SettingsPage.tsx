import React from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useThemeStore, applyTheme } from '../stores/themeStore';
import { Sun, Moon, Monitor, Database, Brain, Mic2, Shield, ExternalLink } from 'lucide-react';
import type { ThemeMode } from '../types';

const themeOptions: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: '淺色', icon: <Sun className="w-4 h-4" /> },
    { id: 'dark', label: '深色', icon: <Moon className="w-4 h-4" /> },
    { id: 'system', label: '系統', icon: <Monitor className="w-4 h-4" /> },
];

export const SettingsPage: React.FC = () => {
    const settings = useSettingsStore();
    const { mode, setMode } = useThemeStore();

    const handleThemeChange = (newMode: ThemeMode) => {
        setMode(newMode);
        applyTheme(newMode);
    };

    return (
        <div className="space-y-5 pb-24 px-1">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold" id="settings-title">設定</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    管理你的 API 金鑰與偏好設定
                </p>
            </div>

            {/* Privacy Notice */}
            <div className="glass-card p-4 flex gap-3">
                <Shield className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        BYOK 隱私保障
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        所有金鑰僅存儲在本機 localStorage，直接從前端呼叫 API，絕不經過伺服器。
                    </p>
                </div>
            </div>

            {/* Theme Switch */}
            <div className="glass-card-solid p-5 space-y-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Sun className="w-4 h-4 text-brand-500" />
                    主題模式
                </h2>
                <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-900 rounded-xl p-1">
                    {themeOptions.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => handleThemeChange(opt.id)}
                            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${mode === opt.id
                                    ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            id={`theme-${opt.id}`}
                        >
                            {opt.icon}
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Supabase Config */}
            <div className="glass-card-solid p-5 space-y-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    Supabase 雲端同步
                </h2>
                <p className="text-xs text-slate-400">連結你的 Supabase 專案以同步單字庫</p>

                <div className="space-y-2.5">
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Project URL</label>
                        <input
                            id="supabase-url"
                            type="url"
                            value={settings.supabaseUrl}
                            onChange={(e) => settings.setSupabaseUrl(e.target.value)}
                            placeholder="https://your-project.supabase.co"
                            className="input-field text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Anon Key</label>
                        <input
                            id="supabase-key"
                            type="password"
                            value={settings.supabaseAnonKey}
                            onChange={(e) => settings.setSupabaseAnonKey(e.target.value)}
                            placeholder="eyJhbGciOiJIUzI1NiIs..."
                            className="input-field text-sm font-mono"
                        />
                    </div>
                </div>

                <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 transition-colors"
                >
                    前往 Supabase Dashboard
                    <ExternalLink className="w-3 h-3" />
                </a>
            </div>

            {/* Gemini Config */}
            <div className="glass-card-solid p-5 space-y-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-500" />
                    Google Gemini AI
                </h2>
                <p className="text-xs text-slate-400">語境字典的 AI 動力來源</p>

                <div>
                    <label className="text-xs text-slate-500 mb-1 block">API Key</label>
                    <input
                        id="gemini-key"
                        type="password"
                        value={settings.geminiApiKey}
                        onChange={(e) => settings.setGeminiApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="input-field text-sm font-mono"
                    />
                </div>

                <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 transition-colors"
                >
                    取得 Gemini API Key
                    <ExternalLink className="w-3 h-3" />
                </a>
            </div>

            {/* Azure Config */}
            <div className="glass-card-solid p-5 space-y-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Mic2 className="w-4 h-4 text-blue-500" />
                    Azure Speech Services
                </h2>
                <p className="text-xs text-slate-400">發音評估的語音分析引擎</p>

                <div className="space-y-2.5">
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">API Key</label>
                        <input
                            id="azure-key"
                            type="password"
                            value={settings.azureApiKey}
                            onChange={(e) => settings.setAzureApiKey(e.target.value)}
                            placeholder="your-azure-speech-key"
                            className="input-field text-sm font-mono"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Region</label>
                        <input
                            id="azure-region"
                            type="text"
                            value={settings.azureRegion}
                            onChange={(e) => settings.setAzureRegion(e.target.value)}
                            placeholder="eastasia"
                            className="input-field text-sm"
                        />
                    </div>
                </div>

                <a
                    href="https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 transition-colors"
                >
                    建立 Azure Speech 資源
                    <ExternalLink className="w-3 h-3" />
                </a>
            </div>

            {/* Version info */}
            <div className="text-center py-4">
                <p className="text-xs text-slate-400 dark:text-slate-600">
                    Shadowing PWA v1.0 · 私人專用
                </p>
            </div>
        </div>
    );
};
