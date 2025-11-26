import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/dataService';
import { Setting } from '../types';

export interface AppSettings {
    // General
    language: string;
    weekStartsOn: 'sunday' | 'monday';

    // Habit Preferences
    defaultReminderTime: string;
    aiInsights: boolean;
    gamification: boolean;

    // Health Preferences
    defaultMetricUnit: 'metric' | 'imperial';
    healthReminders: boolean;

    // Finance Preferences
    defaultCurrency: string;
    budgetAlertThreshold: number;
    budgetNotifications: boolean;
    showNetWorth: boolean;

    // Notes Preferences
    defaultNoteView: 'grid' | 'list';
    autoSaveNotes: boolean;
    markdownPreview: boolean;
    defaultFontSize: 'small' | 'medium' | 'large';

    // Islamic Preferences
    islamicHabitIntegration: boolean;
    defaultPrayerReminder: boolean;
    hijriCalendar: boolean;
    selectedIsland: string; // Prayer times location

    // Islamic Font Settings
    quranArabicFont: string;
    quranDhivehiFont: string;
    quranEnglishFont: string;
    duaArabicFont: string;
    hadithArabicFont: string;
    quranArabicSize: string;
    quranDhivehiSize: string;
    quranEnglishSize: string;
    duaArabicSize: string;
    hadithArabicSize: string;

    // Advanced Settings
    offlineMode: boolean;
    autoSyncInterval: 'realtime' | '5' | '15' | '30' | 'manual';
    dataCompression: boolean;

    // Backup & Sync
    autoBackup: boolean;
    backupFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
    lastBackup: string | null;
}

const DEFAULT_SETTINGS: AppSettings = {
    language: 'en',
    weekStartsOn: 'sunday',
    defaultReminderTime: '09:00',
    aiInsights: true,
    gamification: false,
    defaultMetricUnit: 'metric',
    healthReminders: false,
    defaultCurrency: 'USD',
    budgetAlertThreshold: 75,
    budgetNotifications: false,
    showNetWorth: true,
    defaultNoteView: 'grid',
    autoSaveNotes: true,
    markdownPreview: true,
    defaultFontSize: 'medium',
    islamicHabitIntegration: false,
    defaultPrayerReminder: false,
    hijriCalendar: true,
    selectedIsland: 'K01', // Male' by default
    quranArabicFont: 'Amiri',
    quranDhivehiFont: 'Noto Sans Thaana',
    quranEnglishFont: 'Inter',
    duaArabicFont: 'Amiri',
    hadithArabicFont: 'Noto Sans Arabic',
    quranArabicSize: '2rem',
    quranDhivehiSize: '1.5rem',
    quranEnglishSize: '1rem',
    duaArabicSize: '1.5rem',
    hadithArabicSize: '1.25rem',
    offlineMode: true,
    autoSyncInterval: 'realtime',
    dataCompression: false,
    autoBackup: true,
    backupFrequency: 'daily',
    lastBackup: null,
};

// Helper function to apply font settings to CSS variables
function applyFontSettings(settings: AppSettings) {
    document.documentElement.style.setProperty('--font-quran-arabic', settings.quranArabicFont);
    document.documentElement.style.setProperty('--font-quran-dhivehi', settings.quranDhivehiFont);
    document.documentElement.style.setProperty('--font-quran-english', settings.quranEnglishFont);
    document.documentElement.style.setProperty('--font-dua-arabic', settings.duaArabicFont);
    document.documentElement.style.setProperty('--font-hadith-arabic', settings.hadithArabicFont);
    document.documentElement.style.setProperty('--font-size-quran-arabic', settings.quranArabicSize);
    document.documentElement.style.setProperty('--font-size-quran-dhivehi', settings.quranDhivehiSize);
    document.documentElement.style.setProperty('--font-size-quran-english', settings.quranEnglishSize);
    document.documentElement.style.setProperty('--font-size-dua-arabic', settings.duaArabicSize);
    document.documentElement.style.setProperty('--font-size-hadith-arabic', settings.hadithArabicSize);
}

export function useSettings() {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    // Load settings from Supabase
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const allSettings = await settingsService.getAll();
                const loadedSettings: Partial<AppSettings> = {};

                allSettings?.forEach((setting: Setting) => {
                    loadedSettings[setting.key as keyof AppSettings] = setting.value;
                });

                // Merge with defaults
                const mergedSettings = { ...DEFAULT_SETTINGS, ...loadedSettings };
                setSettings(mergedSettings);

                // Apply font settings to CSS variables
                applyFontSettings(mergedSettings);
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    // Save a single setting
    const updateSetting = useCallback(async <K extends keyof AppSettings>(
        key: K,
        value: AppSettings[K]
    ) => {
        try {
            // Update local state immediately
            const newSettings = { ...settings, [key]: value };
            setSettings(newSettings);

            // Apply font settings if it's a font-related setting
            if (key.includes('Font') || key.includes('Size')) {
                applyFontSettings(newSettings);
            }

            // Save to Supabase
            const existing = await settingsService.getByKey(key as string);
            if (existing && existing.length > 0) {
                // Update existing - delete and recreate since key is primary key
                await settingsService.delete(key as any);
            }
            await settingsService.create({ key: key as string, value });

            // Also save to localStorage as backup
            localStorage.setItem(`setting_${key}`, JSON.stringify(value));

            return true;
        } catch (error) {
            console.error(`Failed to save setting ${key}:`, error);
            return false;
        }
    }, [settings]);

    // Save multiple settings at once
    const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
        try {
            const promises = Object.entries(updates).map(([key, value]) =>
                updateSetting(key as keyof AppSettings, value)
            );
            await Promise.all(promises);
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }, [updateSetting]);

    // Reset to defaults
    const resetSettings = useCallback(async () => {
        try {
            setSettings(DEFAULT_SETTINGS);
            // Clear all settings from Supabase
            const allSettings = await settingsService.getAll();
            await Promise.all(allSettings?.map(s => settingsService.delete(s.key as any)) || []);
            return true;
        } catch (error) {
            console.error('Failed to reset settings:', error);
            return false;
        }
    }, []);

    return {
        settings,
        loading,
        updateSetting,
        updateSettings,
        resetSettings,
    };
}

