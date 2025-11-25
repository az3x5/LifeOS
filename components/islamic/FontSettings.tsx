import React, { useState, useEffect } from 'react';

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

const ARABIC_FONTS = [
    { name: 'Amiri', label: 'Amiri (Traditional)', description: 'Classic Naskh style, ideal for Quran' },
    { name: 'Amiri Quran', label: 'Amiri Quran', description: 'Specialized Quran font' },
    { name: 'Scheherazade New', label: 'Scheherazade New', description: 'Modern, highly readable' },
    { name: 'Noto Naskh Arabic', label: 'Noto Naskh Arabic', description: 'Traditional Naskh style' },
    { name: 'Noto Sans Arabic', label: 'Noto Sans Arabic', description: 'Modern sans-serif' },
    { name: 'Lateef', label: 'Lateef', description: 'Extended Arabic script' },
    { name: 'Aref Ruqaa', label: 'Aref Ruqaa', description: 'Ruqaa calligraphic style' },
    { name: 'Cairo', label: 'Cairo', description: 'Modern geometric sans-serif' },
    { name: 'Tajawal', label: 'Tajawal', description: 'Clean, modern Arabic' },
    { name: 'Markazi Text', label: 'Markazi Text', description: 'Elegant text font' },
];

const DHIVEHI_FONTS = [
    { name: 'Noto Sans Thaana', label: 'Noto Sans Thaana', description: 'Official Google Thaana font' },
    { name: 'MV Waheed', label: 'MV Waheed', description: 'Traditional Dhivehi font' },
    { name: 'Faruma', label: 'Faruma', description: 'Popular Maldivian font' },
];

const ENGLISH_FONTS = [
    { name: 'Inter', label: 'Inter', description: 'Modern, highly readable' },
    { name: 'Roboto', label: 'Roboto', description: 'Google\'s signature font' },
    { name: 'Open Sans', label: 'Open Sans', description: 'Friendly, clean design' },
    { name: 'Lato', label: 'Lato', description: 'Warm, professional' },
    { name: 'Poppins', label: 'Poppins', description: 'Geometric sans-serif' },
    { name: 'Nunito', label: 'Nunito', description: 'Rounded, friendly' },
    { name: 'Source Sans 3', label: 'Source Sans 3', description: 'Adobe\'s open-source font' },
    { name: 'Merriweather', label: 'Merriweather', description: 'Elegant serif' },
    { name: 'Crimson Text', label: 'Crimson Text', description: 'Classic book font' },
];

const FONT_SIZES = [
    { value: '0.875rem', label: 'Small' },
    { value: '1rem', label: 'Normal' },
    { value: '1.125rem', label: 'Medium' },
    { value: '1.25rem', label: 'Large' },
    { value: '1.5rem', label: 'Extra Large' },
    { value: '1.75rem', label: 'Huge' },
    { value: '2rem', label: 'Massive' },
    { value: '2.5rem', label: 'Giant' },
];

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

export const FontSettings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [settings, setSettings] = useState<FontSettings>(DEFAULT_SETTINGS);

    useEffect(() => {
        // Load settings from localStorage
        const saved = localStorage.getItem('islamic-font-settings');
        if (saved) {
            setSettings(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
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

        // Save to localStorage
        localStorage.setItem('islamic-font-settings', JSON.stringify(settings));
    }, [settings]);

    const resetToDefaults = () => {
        setSettings(DEFAULT_SETTINGS);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-primary border border-tertiary rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-primary border-b border-tertiary p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary">Font Settings</h2>
                        <p className="text-sm text-text-muted mt-1">Customize fonts and sizes for Islamic content</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-tertiary hover:bg-accent hover:text-white transition-all flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">
                    {/* Quran Arabic Font */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            <span className="material-symbols-outlined text-accent">menu_book</span>
                            Quran Arabic Font
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ARABIC_FONTS.map((font) => (
                                <button
                                    key={font.name}
                                    onClick={() => setSettings({ ...settings, quranArabic: font.name })}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                                        settings.quranArabic === font.name
                                            ? 'border-accent bg-accent/10'
                                            : 'border-tertiary bg-secondary hover:border-accent/50'
                                    }`}
                                >
                                    <div className="font-semibold text-text-primary">{font.label}</div>
                                    <div className="text-sm text-text-muted mt-1">{font.description}</div>
                                    <div className="text-2xl mt-2 font-arabic" style={{ fontFamily: font.name }}>
                                        بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-text-secondary">Font Size:</label>
                            <select
                                value={settings.quranArabicSize}
                                onChange={(e) => setSettings({ ...settings, quranArabicSize: e.target.value })}
                                className="px-4 py-2 rounded-lg bg-secondary border border-tertiary text-text-primary"
                            >
                                {FONT_SIZES.map((size) => (
                                    <option key={size.value} value={size.value}>{size.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Quran Dhivehi Font */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            <span className="material-symbols-outlined text-accent">translate</span>
                            Quran Dhivehi Font
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {DHIVEHI_FONTS.map((font) => (
                                <button
                                    key={font.name}
                                    onClick={() => setSettings({ ...settings, quranDhivehi: font.name })}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                                        settings.quranDhivehi === font.name
                                            ? 'border-accent bg-accent/10'
                                            : 'border-tertiary bg-secondary hover:border-accent/50'
                                    }`}
                                >
                                    <div className="font-semibold text-text-primary">{font.label}</div>
                                    <div className="text-sm text-text-muted mt-1">{font.description}</div>
                                    <div className="text-xl mt-2 font-thaana" style={{ fontFamily: font.name }}>
                                        ރަޙްމާން ވަންތަ ރަޙީމް ވަންތަ އައްލާހު
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-text-secondary">Font Size:</label>
                            <select
                                value={settings.quranDhivehiSize}
                                onChange={(e) => setSettings({ ...settings, quranDhivehiSize: e.target.value })}
                                className="px-4 py-2 rounded-lg bg-secondary border border-tertiary text-text-primary"
                            >
                                {FONT_SIZES.map((size) => (
                                    <option key={size.value} value={size.value}>{size.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Quran English Font */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            <span className="material-symbols-outlined text-accent">language</span>
                            Quran English Font
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ENGLISH_FONTS.map((font) => (
                                <button
                                    key={font.name}
                                    onClick={() => setSettings({ ...settings, quranEnglish: font.name })}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                                        settings.quranEnglish === font.name
                                            ? 'border-accent bg-accent/10'
                                            : 'border-tertiary bg-secondary hover:border-accent/50'
                                    }`}
                                >
                                    <div className="font-semibold text-text-primary">{font.label}</div>
                                    <div className="text-sm text-text-muted mt-1">{font.description}</div>
                                    <div className="text-base mt-2" style={{ fontFamily: font.name }}>
                                        In the name of Allah, the Entirely Merciful
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-text-secondary">Font Size:</label>
                            <select
                                value={settings.quranEnglishSize}
                                onChange={(e) => setSettings({ ...settings, quranEnglishSize: e.target.value })}
                                className="px-4 py-2 rounded-lg bg-secondary border border-tertiary text-text-primary"
                            >
                                {FONT_SIZES.map((size) => (
                                    <option key={size.value} value={size.value}>{size.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Dua Arabic Font */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            <span className="material-symbols-outlined text-accent">volunteer_activism</span>
                            Dua Arabic Font
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ARABIC_FONTS.map((font) => (
                                <button
                                    key={font.name}
                                    onClick={() => setSettings({ ...settings, duaArabic: font.name })}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                                        settings.duaArabic === font.name
                                            ? 'border-accent bg-accent/10'
                                            : 'border-tertiary bg-secondary hover:border-accent/50'
                                    }`}
                                >
                                    <div className="font-semibold text-text-primary">{font.label}</div>
                                    <div className="text-sm text-text-muted mt-1">{font.description}</div>
                                    <div className="text-xl mt-2 font-arabic" style={{ fontFamily: font.name }}>
                                        اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-text-secondary">Font Size:</label>
                            <select
                                value={settings.duaArabicSize}
                                onChange={(e) => setSettings({ ...settings, duaArabicSize: e.target.value })}
                                className="px-4 py-2 rounded-lg bg-secondary border border-tertiary text-text-primary"
                            >
                                {FONT_SIZES.map((size) => (
                                    <option key={size.value} value={size.value}>{size.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Hadith Arabic Font */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            <span className="material-symbols-outlined text-accent">auto_stories</span>
                            Hadith Arabic Font
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ARABIC_FONTS.map((font) => (
                                <button
                                    key={font.name}
                                    onClick={() => setSettings({ ...settings, hadithArabic: font.name })}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                                        settings.hadithArabic === font.name
                                            ? 'border-accent bg-accent/10'
                                            : 'border-tertiary bg-secondary hover:border-accent/50'
                                    }`}
                                >
                                    <div className="font-semibold text-text-primary">{font.label}</div>
                                    <div className="text-sm text-text-muted mt-1">{font.description}</div>
                                    <div className="text-lg mt-2 font-arabic" style={{ fontFamily: font.name }}>
                                        إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-text-secondary">Font Size:</label>
                            <select
                                value={settings.hadithArabicSize}
                                onChange={(e) => setSettings({ ...settings, hadithArabicSize: e.target.value })}
                                className="px-4 py-2 rounded-lg bg-secondary border border-tertiary text-text-primary"
                            >
                                {FONT_SIZES.map((size) => (
                                    <option key={size.value} value={size.value}>{size.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-primary border-t border-tertiary p-6 flex items-center justify-between">
                    <button
                        onClick={resetToDefaults}
                        className="px-6 py-3 rounded-xl bg-tertiary text-text-secondary hover:bg-accent hover:text-white transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">refresh</span>
                        Reset to Defaults
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl bg-accent text-white hover:bg-accent/80 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">check</span>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FontSettings;

