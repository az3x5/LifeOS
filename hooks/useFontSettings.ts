import { useEffect } from 'react';

interface FontSettings {
    quranArabic: string;
    quranDhivehi: string;
    quranEnglish: string;
    duaArabic: string;
    hadithArabic: string;
    quranArabicSize: string;
    quranDhivehiSize: string;
    quranEnglishSize: string;
    duaArabicSize: string;
    hadithArabicSize: string;
}

const DEFAULT_SETTINGS: FontSettings = {
    quranArabic: 'Amiri',
    quranDhivehi: 'Noto Sans Thaana',
    quranEnglish: 'Inter',
    duaArabic: 'Amiri',
    hadithArabic: 'Noto Sans Arabic',
    quranArabicSize: '2rem',
    quranDhivehiSize: '1.5rem',
    quranEnglishSize: '1rem',
    duaArabicSize: '1.5rem',
    hadithArabicSize: '1.25rem',
};

/**
 * Hook to load and apply font settings from localStorage
 * This should be called once at the app root level
 */
export const useFontSettings = () => {
    useEffect(() => {
        // Load settings from localStorage
        const saved = localStorage.getItem('islamic-font-settings');
        const settings: FontSettings = saved ? JSON.parse(saved) : DEFAULT_SETTINGS;

        // Apply font settings to CSS variables
        document.documentElement.style.setProperty('--font-quran-arabic', settings.quranArabic);
        document.documentElement.style.setProperty('--font-quran-dhivehi', settings.quranDhivehi);
        document.documentElement.style.setProperty('--font-quran-english', settings.quranEnglish);
        document.documentElement.style.setProperty('--font-dua-arabic', settings.duaArabic);
        document.documentElement.style.setProperty('--font-hadith-arabic', settings.hadithArabic);
        document.documentElement.style.setProperty('--font-size-quran-arabic', settings.quranArabicSize);
        document.documentElement.style.setProperty('--font-size-quran-dhivehi', settings.quranDhivehiSize);
        document.documentElement.style.setProperty('--font-size-quran-english', settings.quranEnglishSize);
        document.documentElement.style.setProperty('--font-size-dua-arabic', settings.duaArabicSize);
        document.documentElement.style.setProperty('--font-size-hadith-arabic', settings.hadithArabicSize);
    }, []);
};

