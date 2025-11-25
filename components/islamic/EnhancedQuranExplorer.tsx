import React, { useState, useMemo, useRef, useEffect } from 'react';
import { islamicDataService, QuranSurah } from '../../services/islamicDataService';
import QuranAudioPlayer, { RECITERS } from './QuranAudioPlayer';
import { useIslamicBookmarks } from '../../hooks/useIslamicBookmarks';

const EnhancedQuranExplorer: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSurah, setSelectedSurah] = useState<QuranSurah | null>(null);
    const [view, setView] = useState<'list' | 'reader'>('list');
    const [selectedTranslation, setSelectedTranslation] = useState<'clear' | 'sahih' | 'haleem' | 'dhivehi'>('clear');
    const [showTranslation, setShowTranslation] = useState(true);
    const [showTafsir, setShowTafsir] = useState(true);
    const [expandedVerse, setExpandedVerse] = useState<string | null>(null);
    const [selectedReciter, setSelectedReciter] = useState(RECITERS[0].id);
    const [showReciterMenu, setShowReciterMenu] = useState(false);
    const [playingVerse, setPlayingVerse] = useState<string | null>(null);
    const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);

    // Bookmarks hook
    const { isBookmarked, toggleBookmark } = useIslamicBookmarks('quran');

    const surahs = useMemo(() => islamicDataService.getQuranSurahs(), []);
    const quranInfo = useMemo(() => islamicDataService.getQuranInfo(), []);
    const hasTafsir = useMemo(() =>
        selectedSurah ? islamicDataService.hasTafsirForSurah(selectedSurah.chapter) : false,
        [selectedSurah]
    );

    const filteredSurahs = useMemo(() => {
        if (!searchQuery) return surahs;
        const query = searchQuery.toLowerCase();
        return surahs.filter(surah =>
            surah.name.toLowerCase().includes(query) ||
            surah.englishname.toLowerCase().includes(query) ||
            surah.chapter.toString().includes(query)
        );
    }, [surahs, searchQuery]);

    const handleSurahClick = (surah: QuranSurah) => {
        setSelectedSurah(surah);
        setView('reader');
    };

    const handleBackToList = () => {
        setView('list');
        setSelectedSurah(null);
    };

    if (view === 'reader' && selectedSurah) {
        return (
            <div className="space-y-4">
                {/* Header */}
                <div className="bg-secondary border border-tertiary rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleBackToList}
                            className="flex items-center gap-2 text-text-secondary hover:text-accent transition-colors"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                            <span>Back to Surahs</span>
                        </button>
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-text-primary">{selectedSurah.englishname}</h2>
                            <p className="text-4xl font-arabic text-accent mt-2">{selectedSurah.arabicname}</p>
                            <p className="text-sm text-text-muted mt-2">
                                {selectedSurah.revelationtype} • {selectedSurah.verses.length} Verses
                            </p>
                        </div>
                        <div className="w-24"></div>
                    </div>

                    {/* Translation Controls */}
                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-tertiary">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showTranslation}
                                onChange={(e) => setShowTranslation(e.target.checked)}
                                className="w-4 h-4 accent-accent"
                            />
                            <span className="text-sm text-text-secondary">Show Translation</span>
                        </label>
                        {showTranslation && (
                            <>
                                <span className="text-sm text-text-muted">|</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedTranslation('clear')}
                                        className={`px-3 py-1 rounded-lg text-sm transition-all ${
                                            selectedTranslation === 'clear'
                                                ? 'bg-accent text-white'
                                                : 'bg-tertiary text-text-secondary hover:bg-accent hover:text-white'
                                        }`}
                                    >
                                        Clear Quran
                                    </button>
                                    <button
                                        onClick={() => setSelectedTranslation('sahih')}
                                        className={`px-3 py-1 rounded-lg text-sm transition-all ${
                                            selectedTranslation === 'sahih'
                                                ? 'bg-accent text-white'
                                                : 'bg-tertiary text-text-secondary hover:bg-accent hover:text-white'
                                        }`}
                                    >
                                        Sahih International
                                    </button>
                                    <button
                                        onClick={() => setSelectedTranslation('haleem')}
                                        className={`px-3 py-1 rounded-lg text-sm transition-all ${
                                            selectedTranslation === 'haleem'
                                                ? 'bg-accent text-white'
                                                : 'bg-tertiary text-text-secondary hover:bg-accent hover:text-white'
                                        }`}
                                    >
                                        Abdel Haleem
                                    </button>
                                    <button
                                        onClick={() => setSelectedTranslation('dhivehi')}
                                        className={`px-3 py-1 rounded-lg text-sm transition-all ${
                                            selectedTranslation === 'dhivehi'
                                                ? 'bg-accent text-white'
                                                : 'bg-tertiary text-text-secondary hover:bg-accent hover:text-white'
                                        }`}
                                    >
                                        ދިވެހި (Dhivehi)
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Audio Reciter Selection & Options */}
                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-tertiary">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-accent text-lg">volume_up</span>
                            <span className="text-sm text-text-secondary">Reciter:</span>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setShowReciterMenu(!showReciterMenu)}
                                className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm bg-tertiary text-text-secondary hover:bg-accent hover:text-white transition-all"
                            >
                                <span>{RECITERS.find(r => r.id === selectedReciter)?.name}</span>
                                <span className="material-symbols-outlined text-base">
                                    {showReciterMenu ? 'expand_less' : 'expand_more'}
                                </span>
                            </button>
                            {showReciterMenu && (
                                <div className="absolute top-full left-0 mt-2 bg-secondary border border-tertiary rounded-lg shadow-lg z-10 min-w-[250px]">
                                    {RECITERS.map((reciter) => (
                                        <button
                                            key={reciter.id}
                                            onClick={() => {
                                                setSelectedReciter(reciter.id);
                                                setShowReciterMenu(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                                selectedReciter === reciter.id
                                                    ? 'bg-accent text-white'
                                                    : 'text-text-secondary hover:bg-tertiary'
                                            }`}
                                        >
                                            <div className="font-medium">{reciter.name}</div>
                                            <div className="text-xs opacity-75">{reciter.quality}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Auto-play Toggle */}
                        <button
                            onClick={() => setAutoPlayEnabled(!autoPlayEnabled)}
                            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-all ${
                                autoPlayEnabled
                                    ? 'bg-accent text-white'
                                    : 'bg-tertiary text-text-secondary hover:bg-accent hover:text-white'
                            }`}
                            title={autoPlayEnabled ? 'Auto-play enabled' : 'Auto-play disabled'}
                        >
                            <span className="material-symbols-outlined text-base">
                                {autoPlayEnabled ? 'playlist_play' : 'playlist_remove'}
                            </span>
                            <span>Auto-play</span>
                        </button>

                        {/* Quran-only View Toggle */}
                        <button
                            onClick={() => setShowTranslation(!showTranslation)}
                            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-all ${
                                !showTranslation
                                    ? 'bg-accent text-white'
                                    : 'bg-tertiary text-text-secondary hover:bg-accent hover:text-white'
                            }`}
                            title={showTranslation ? 'Hide translation (Quran-only)' : 'Show translation'}
                        >
                            <span className="material-symbols-outlined text-base">
                                {showTranslation ? 'translate' : 'menu_book'}
                            </span>
                            <span>{showTranslation ? 'Hide Translation' : 'Quran Only'}</span>
                        </button>

                        {/* Tafsir Toggle */}
                        {hasTafsir && (
                            <button
                                onClick={() => setShowTafsir(!showTafsir)}
                                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-all ${
                                    !showTafsir
                                        ? 'bg-tertiary text-text-secondary hover:bg-accent hover:text-white'
                                        : 'bg-accent text-white'
                                }`}
                                title={showTafsir ? 'Hide Tafsir' : 'Show Tafsir'}
                            >
                                <span className="material-symbols-outlined text-base">
                                    {showTafsir ? 'description' : 'description_off'}
                                </span>
                                <span>{showTafsir ? 'Hide Tafsir' : 'Show Tafsir'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Bismillah */}
                {selectedSurah.chapter !== 1 && selectedSurah.chapter !== 9 && (
                    <div className="bg-secondary border border-tertiary rounded-2xl p-6 text-center">
                        <p className="text-5xl font-arabic text-accent leading-relaxed">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
                        <p className="text-sm text-text-muted mt-3">In the name of Allah, the Entirely Merciful, the Especially Merciful</p>
                    </div>
                )}

                {/* Tafsir Info Banner */}
                {hasTafsir && showTafsir && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-green-500 text-xl">check_circle</span>
                            <div className="flex-1">
                                <p className="text-sm text-text-secondary">
                                    <span className="font-semibold">Tafsir Ibn Kathir Available:</span> Click "Show Tafsir" on any verse to read the commentary.
                                </p>
                            </div>
                        </div>
                    </div>
                )}



                {/* Verses */}
                <div className="space-y-4">
                    {selectedSurah.verses.map((verse) => {
                        const translation = selectedTranslation === 'clear'
                            ? verse.translationClear
                            : selectedTranslation === 'sahih'
                            ? verse.translationSahih
                            : selectedTranslation === 'haleem'
                            ? verse.translationHaleem
                            : verse.translationDhivehi;

                        const verseKey = `${selectedSurah.chapter}:${verse.verse}`;
                        const isExpanded = expandedVerse === verseKey;
                        const isPlaying = playingVerse === verseKey;
                        const tafsir = islamicDataService.getTafsirForVerse(selectedSurah.chapter, verse.verse);

                        return (
                            <div
                                key={verse.verse}
                                id={`verse-${verseKey}`}
                                className={`bg-secondary border rounded-2xl p-6 hover:shadow-lg transition-all duration-300 ${
                                    isPlaying
                                        ? 'border-accent shadow-lg shadow-accent/20 ring-2 ring-accent/30'
                                        : 'border-tertiary'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white font-bold">
                                        {verse.verse}
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        {/* Arabic Text */}
                                        <p
                                            className={`quran-arabic transition-all duration-300 ${
                                                isPlaying
                                                    ? 'text-accent scale-[1.02] font-semibold'
                                                    : ''
                                            }`}
                                            style={isPlaying ? { animation: 'verse-pulse 2s ease-in-out infinite' } : {}}
                                        >
                                            {verse.text}
                                        </p>

                                        {/* Translation */}
                                        {showTranslation && translation && (
                                            <div className="pt-3 border-t border-tertiary">
                                                <p className={
                                                    selectedTranslation === 'dhivehi'
                                                        ? 'quran-dhivehi'
                                                        : 'quran-english'
                                                }>
                                                    {translation}
                                                </p>
                                            </div>
                                        )}

                                        {/* Tafsir Section */}
                                        {tafsir && showTafsir && (
                                            <div className="pt-3 border-t border-tertiary">
                                                <button
                                                    onClick={() => setExpandedVerse(isExpanded ? null : verseKey)}
                                                    className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-base">
                                                        {isExpanded ? 'expand_less' : 'expand_more'}
                                                    </span>
                                                    <span className="font-semibold">
                                                        {isExpanded ? 'Hide Tafsir' : 'Show Tafsir (Ibn Kathir)'}
                                                    </span>
                                                </button>

                                                {isExpanded && (
                                                    <div className="mt-3 p-4 bg-tertiary rounded-lg">
                                                        <div className="flex items-start gap-2 mb-2">
                                                            <span className="material-symbols-outlined text-accent text-lg">menu_book</span>
                                                            <h4 className="font-semibold text-text-primary">Tafsir Ibn Kathir</h4>
                                                        </div>
                                                        <div
                                                            className="text-sm text-text-secondary leading-relaxed prose prose-sm max-w-none"
                                                            dangerouslySetInnerHTML={{ __html: tafsir }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Verse Actions */}
                                        <div className="flex items-center justify-between pt-3 border-t border-tertiary">
                                            <div className="flex items-center gap-3">
                                                {/* Verse Reference */}
                                                <div className="flex items-center gap-2 text-sm text-text-muted">
                                                    <span className="material-symbols-outlined text-base">menu_book</span>
                                                    <span>Surah {selectedSurah.chapter}:{verse.verse}</span>
                                                </div>

                                                {/* Bookmark Button */}
                                                <button
                                                    onClick={() => {
                                                        const reference = `${selectedSurah.chapter}:${verse.verse}`;
                                                        const bookmarked = isBookmarked(reference);
                                                        toggleBookmark({
                                                            type: 'quran',
                                                            reference,
                                                            title: `${selectedSurah.englishname} ${selectedSurah.chapter}:${verse.verse}`,
                                                            content: verse.text,
                                                        });
                                                    }}
                                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm transition-all ${
                                                        isBookmarked(`${selectedSurah.chapter}:${verse.verse}`)
                                                            ? 'bg-accent text-white'
                                                            : 'bg-tertiary text-text-secondary hover:bg-accent hover:text-white'
                                                    }`}
                                                    title={isBookmarked(`${selectedSurah.chapter}:${verse.verse}`) ? 'Remove bookmark' : 'Add bookmark'}
                                                >
                                                    <span className="material-symbols-outlined text-base">
                                                        {isBookmarked(`${selectedSurah.chapter}:${verse.verse}`) ? 'bookmark' : 'bookmark_border'}
                                                    </span>
                                                </button>
                                            </div>

                                            {/* Audio Player */}
                                            <QuranAudioPlayer
                                                chapter={selectedSurah.chapter}
                                                verse={verse.verse}
                                                reciter={selectedReciter}
                                                shouldPlay={isPlaying}
                                                onPlayStateChange={(playing) => {
                                                    if (playing) {
                                                        setPlayingVerse(verseKey);
                                                    } else {
                                                        setPlayingVerse(null);

                                                        // Auto-play next verse if enabled
                                                        if (autoPlayEnabled && selectedSurah) {
                                                            const currentIndex = selectedSurah.verses.findIndex(v => v.verse === verse.verse);
                                                            if (currentIndex < selectedSurah.verses.length - 1) {
                                                                // Trigger next verse after a short delay
                                                                setTimeout(() => {
                                                                    const nextVerse = selectedSurah.verses[currentIndex + 1];
                                                                    const nextVerseKey = `${selectedSurah.chapter}:${nextVerse.verse}`;
                                                                    setPlayingVerse(nextVerseKey);

                                                                    // Scroll to next verse
                                                                    const nextElement = document.getElementById(`verse-${nextVerseKey}`);
                                                                    if (nextElement) {
                                                                        nextElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                    }
                                                                }, 500);
                                                            }
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                    search
                </span>
                <input
                    type="text"
                    placeholder="Search surahs by name or number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-secondary border border-tertiary rounded-2xl py-3 pl-12 pr-4 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-secondary border border-tertiary rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-accent">{quranInfo.chapters}</p>
                    <p className="text-sm text-text-muted mt-1">Surahs</p>
                </div>
                <div className="bg-secondary border border-tertiary rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-500">{quranInfo.verses}</p>
                    <p className="text-sm text-text-muted mt-1">Verses</p>
                </div>
                <div className="bg-secondary border border-tertiary rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-500">{quranInfo.juzs}</p>
                    <p className="text-sm text-text-muted mt-1">Juz</p>
                </div>
                <div className="bg-secondary border border-tertiary rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-500">{quranInfo.pages}</p>
                    <p className="text-sm text-text-muted mt-1">Pages</p>
                </div>
            </div>

            {/* Surah List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSurahs.map((surah) => (
                    <button
                        key={surah.chapter}
                        onClick={() => handleSurahClick(surah)}
                        className="bg-secondary border border-tertiary rounded-2xl p-4 hover:shadow-lg hover:border-accent transition-all duration-300 text-left group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-accent rounded-full flex items-center justify-center text-white font-bold">
                                {surah.chapter}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors">
                                    {surah.englishname}
                                </h3>
                                <p className="text-xl font-arabic text-accent">{surah.arabicname}</p>
                                <p className="text-sm text-text-muted mt-1">
                                    {surah.revelationtype} • {surah.verses.length} verses
                                </p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {filteredSurahs.length === 0 && (
                <div className="text-center py-12 text-text-muted">
                    <span className="material-symbols-outlined text-6xl mb-4 opacity-50">search_off</span>
                    <p>No surahs found matching "{searchQuery}"</p>
                </div>
            )}
        </div>
    );
};

export default EnhancedQuranExplorer;

