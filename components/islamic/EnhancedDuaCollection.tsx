import React, { useState, useMemo } from 'react';
import { islamicDataService, Dua } from '../../services/islamicDataService';
import { useArabicSpeech } from '../../hooks/useArabicSpeech';
import hisnData from '../../data/islamic/hisn-almuslim-structured.json';

interface HisnCategory {
    id: number;
    name: string;
    arabicName: string;
    icon: string;
    color: string;
    duaCount: number;
}

interface HisnDua {
    id: number;
    categoryId: number;
    arabic: string;
    transliteration?: string;
    translation?: string;
    reference: string;
    order: number;
}

const EnhancedDuaCollection: React.FC = () => {
    const [view, setView] = useState<'curated' | 'hisn'>('curated');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [expandedDua, setExpandedDua] = useState<number | null>(null);

    // Hisn al-Muslim state
    const [hisnSelectedCategory, setHisnSelectedCategory] = useState<number | null>(null);
    const [hisnSearchQuery, setHisnSearchQuery] = useState('');
    const [showHisnTranslation, setShowHisnTranslation] = useState(true);
    const [showHisnTransliteration, setShowHisnTransliteration] = useState(true);

    // Audio state
    const { isSupported, isSpeaking, speak, stop, arabicVoices } = useArabicSpeech();
    const [currentPlayingId, setCurrentPlayingId] = useState<number | null>(null);

    const categories = useMemo(() => islamicDataService.getDuaCategories(), []);
    const allDuas = useMemo(() => islamicDataService.getAllDuas(), []);

    // Hisn al-Muslim data
    const hisnCategories = useMemo(() => hisnData.categories as HisnCategory[], []);
    const hisnAllDuas = useMemo(() => hisnData.duas as HisnDua[], []);

    const filteredDuas = useMemo(() => {
        let duas: (Dua & { categoryName?: string; categoryColor?: string; categoryIcon?: string })[] = [];

        if (selectedCategory === 'all') {
            // Get all duas with category info
            duas = allDuas.map(dua => {
                const cat = categories.find(c => c.id === dua.categoryId);
                return {
                    ...dua,
                    categoryName: cat?.name || '',
                    categoryColor: cat?.color || '#666',
                    categoryIcon: cat?.icon || 'bookmark'
                };
            });
        } else {
            // Get duas for selected category
            const cat = categories.find(c => c.slug === selectedCategory);
            if (cat) {
                duas = allDuas
                    .filter(dua => dua.categoryId === cat.id)
                    .map(dua => ({
                        ...dua,
                        categoryName: cat.name || '',
                        categoryColor: cat.color || '#666',
                        categoryIcon: cat.icon || 'bookmark'
                    }));
            }
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            duas = duas.filter(dua =>
                dua.title?.toLowerCase().includes(query) ||
                dua.translation?.toLowerCase().includes(query) ||
                dua.transliteration?.toLowerCase().includes(query) ||
                dua.arabic?.includes(searchQuery) ||
                dua.reference?.toLowerCase().includes(query) ||
                dua.benefits?.toLowerCase().includes(query)
            );
        }

        return duas;
    }, [categories, allDuas, selectedCategory, searchQuery]);

    const filteredHisnCategories = useMemo(() => {
        if (!hisnSearchQuery) return hisnCategories;
        const query = hisnSearchQuery.toLowerCase();
        return hisnCategories.filter(cat =>
            cat.name.toLowerCase().includes(query) ||
            cat.arabicName.includes(hisnSearchQuery)
        );
    }, [hisnCategories, hisnSearchQuery]);

    const currentHisnCategoryDuas = useMemo(() => {
        if (!hisnSelectedCategory) return [];
        return hisnAllDuas.filter(dua => dua.categoryId === hisnSelectedCategory);
    }, [hisnAllDuas, hisnSelectedCategory]);

    const currentHisnCategory = useMemo(() => {
        return hisnCategories.find(cat => cat.id === hisnSelectedCategory);
    }, [hisnCategories, hisnSelectedCategory]);

    const toggleDua = (id: number) => {
        setExpandedDua(expandedDua === id ? null : id);
    };

    const handleViewChange = (newView: 'curated' | 'hisn') => {
        setView(newView);
        setSearchQuery('');
        setHisnSearchQuery('');
        setSelectedCategory('all');
        setHisnSelectedCategory(null);
        stop(); // Stop any playing audio
        setCurrentPlayingId(null);
    };

    const handlePlayAudio = (id: number, arabicText: string) => {
        if (currentPlayingId === id && isSpeaking) {
            stop();
            setCurrentPlayingId(null);
        } else {
            stop(); // Stop any currently playing audio
            speak(arabicText, { rate: 0.7, lang: 'ar-SA' });
            setCurrentPlayingId(id);
        }
    };

    return (
        <div className="space-y-4">
            {/* View Selector */}
            <div className="bg-secondary border border-tertiary rounded-2xl p-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => handleViewChange('curated')}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                            view === 'curated'
                                ? 'bg-accent text-white shadow-lg'
                                : 'bg-tertiary text-text-secondary hover:bg-accent/20'
                        }`}
                    >
                        <span className="material-symbols-outlined">star</span>
                        <span>Essential Duas</span>
                        <span className="text-sm opacity-80">({allDuas.length})</span>
                    </button>
                    <button
                        onClick={() => handleViewChange('hisn')}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                            view === 'hisn'
                                ? 'bg-accent text-white shadow-lg'
                                : 'bg-tertiary text-text-secondary hover:bg-accent/20'
                        }`}
                    >
                        <span className="material-symbols-outlined">menu_book</span>
                        <span>Hisn al-Muslim</span>
                        <span className="text-sm opacity-80">({hisnAllDuas.length})</span>
                    </button>
                </div>
            </div>

            {/* Curated Duas View */}
            {view === 'curated' && (
                <>
                    {/* Search and Filter */}
                    <div className="bg-secondary border border-tertiary rounded-2xl p-4 space-y-4">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                                search
                            </span>
                            <input
                                type="text"
                                placeholder="Search duas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-tertiary border border-primary rounded-xl py-3 pl-12 pr-4 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
                                    selectedCategory === 'all'
                                        ? 'bg-accent text-white'
                                        : 'bg-tertiary text-text-secondary hover:bg-accent hover:text-white'
                                }`}
                            >
                                <span className="material-symbols-outlined text-lg">apps</span>
                                All Categories
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.slug}
                                    onClick={() => setSelectedCategory(cat.slug)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
                                        selectedCategory === cat.slug
                                            ? 'text-white'
                                            : 'bg-tertiary text-text-secondary hover:opacity-90'
                                    }`}
                                    style={{
                                        backgroundColor: selectedCategory === cat.slug ? cat.color : undefined
                                    }}
                                >
                                    <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-secondary border border-tertiary rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-accent">{categories.length}</p>
                            <p className="text-sm text-text-muted mt-1">Categories</p>
                        </div>
                        <div className="bg-secondary border border-tertiary rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-blue-500">{allDuas.length}</p>
                            <p className="text-sm text-text-muted mt-1">Total Duas</p>
                        </div>
                        <div className="bg-secondary border border-tertiary rounded-xl p-4 text-center col-span-2 md:col-span-1">
                            <p className="text-2xl font-bold text-green-500">{filteredDuas.length}</p>
                            <p className="text-sm text-text-muted mt-1">Showing</p>
                        </div>
                    </div>

                    {/* Duas List */}
                    <div className="space-y-4">
                        {filteredDuas.length === 0 ? (
                            <div className="text-center py-12 text-text-muted">
                                <span className="material-symbols-outlined text-6xl mb-4 opacity-50">search_off</span>
                                <p>No duas found matching your criteria</p>
                            </div>
                        ) : (
                            filteredDuas.map((dua) => (
                                <div
                                    key={dua.id}
                                    className="bg-secondary border border-tertiary rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300"
                                >
                                    <button
                                        onClick={() => toggleDua(dua.id)}
                                        className="w-full p-6 text-left flex items-center justify-between hover:bg-tertiary transition-colors"
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            {/* Category Icon */}
                                            <div
                                                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: `${dua.categoryColor}20` }}
                                            >
                                                <span
                                                    className="material-symbols-outlined text-2xl"
                                                    style={{ color: dua.categoryColor }}
                                                >
                                                    {dua.categoryIcon}
                                                </span>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span
                                                        className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                                                        style={{ backgroundColor: dua.categoryColor }}
                                                    >
                                                        {dua.categoryName}
                                                    </span>
                                                    {dua.time && (
                                                        <span className="px-3 py-1 bg-blue-500/20 text-blue-500 rounded-full text-xs font-semibold">
                                                            {dua.time}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-lg font-semibold text-text-primary">{dua.title}</h3>
                                                {dua.benefits && (
                                                    <p className="text-sm text-text-muted mt-1 line-clamp-2">{dua.benefits}</p>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`material-symbols-outlined text-accent transition-transform duration-300 ${
                                            expandedDua === dua.id ? 'rotate-180' : ''
                                        }`}>
                                            expand_more
                                        </span>
                                    </button>

                                    {expandedDua === dua.id && (
                                        <div className="px-6 pb-6 space-y-4 border-t border-tertiary pt-4">
                                            {/* Audio Player */}
                                            {dua.arabic && isSupported && (
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handlePlayAudio(dua.id, dua.arabic!)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-xl transition-all"
                                                    >
                                                        <span className="material-symbols-outlined">
                                                            {currentPlayingId === dua.id && isSpeaking ? 'stop' : 'play_arrow'}
                                                        </span>
                                                        <span className="text-sm font-semibold">
                                                            {currentPlayingId === dua.id && isSpeaking ? 'Stop Audio' : 'Play Audio'}
                                                        </span>
                                                    </button>
                                                    {arabicVoices.length === 0 && (
                                                        <span className="text-xs text-text-muted">
                                                            (Using default voice)
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Arabic */}
                                            {dua.arabic && (
                                                <div className="bg-tertiary/50 rounded-xl p-4">
                                                    <p className="text-sm font-semibold text-text-muted mb-3">Arabic:</p>
                                                    <p className="dua-arabic">
                                                        {dua.arabic}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Transliteration */}
                                            {(dua.transliteration || dua.latin) && (
                                                <div>
                                                    <p className="text-sm font-semibold text-text-muted mb-2">Transliteration:</p>
                                                    <p className="text-base text-text-secondary italic leading-relaxed">
                                                        {dua.transliteration || dua.latin}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Translation */}
                                            {dua.translation && (
                                                <div>
                                                    <p className="text-sm font-semibold text-text-muted mb-2">Translation:</p>
                                                    <p className="text-base text-text-primary leading-relaxed">
                                                        {dua.translation}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Benefits */}
                                            {(dua.benefits || dua.fawaid) && (
                                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                                                    <div className="flex items-start gap-2">
                                                        <span className="material-symbols-outlined text-green-500 mt-0.5">
                                                            verified
                                                        </span>
                                                        <div>
                                                            <p className="text-sm font-semibold text-green-500 mb-1">Benefits:</p>
                                                            <p className="text-base text-text-secondary leading-relaxed">
                                                                {dua.benefits || dua.fawaid}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Reference/Source */}
                                            {(dua.reference || dua.source) && (
                                                <div className="pt-4 border-t border-tertiary flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-text-muted text-sm">
                                                        menu_book
                                                    </span>
                                                    <p className="text-sm text-text-muted">
                                                        <span className="font-semibold">Reference:</span> {dua.reference || dua.source}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Hisn al-Muslim View */}
            {view === 'hisn' && (
                <>
                    {hisnSelectedCategory === null ? (
                        <>
                            {/* Header */}
                            <div className="bg-secondary border border-tertiary rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-text-primary">Hisn al-Muslim</h2>
                                        <p className="text-text-muted font-arabic text-xl">حصن المسلم</p>
                                        <p className="text-sm text-text-muted mt-1">Fortress of the Muslim - Complete Collection</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-bold text-accent">{hisnData.metadata.totalCategories}</div>
                                        <div className="text-sm text-text-muted">Categories</div>
                                    </div>
                                </div>

                                {/* Search Bar */}
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                                        search
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Search categories..."
                                        value={hisnSearchQuery}
                                        onChange={(e) => setHisnSearchQuery(e.target.value)}
                                        className="w-full bg-tertiary border border-primary rounded-xl py-3 pl-10 pr-4 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                                    />
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-secondary border border-tertiary rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-accent">{hisnData.metadata.totalCategories}</p>
                                    <p className="text-sm text-text-muted mt-1">Categories</p>
                                </div>
                                <div className="bg-secondary border border-tertiary rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-blue-500">{hisnData.metadata.totalDuas}</p>
                                    <p className="text-sm text-text-muted mt-1">Total Duas</p>
                                </div>
                                <div className="bg-secondary border border-tertiary rounded-xl p-4 text-center">
                                    <p className="text-lg font-bold text-green-500 font-arabic">سعيد القحطاني</p>
                                    <p className="text-sm text-text-muted mt-1">Author</p>
                                </div>
                                <div className="bg-secondary border border-tertiary rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-purple-500">100%</p>
                                    <p className="text-sm text-text-muted mt-1">Authentic</p>
                                </div>
                            </div>

                            {/* Categories Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredHisnCategories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => setHisnSelectedCategory(category.id)}
                                        className="bg-secondary border border-tertiary rounded-xl p-4 hover:border-accent transition-all duration-300 text-left group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: category.color + '20' }}
                                            >
                                                <span className="material-symbols-outlined" style={{ color: category.color }}>
                                                    {category.icon}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-text-primary group-hover:text-accent transition-colors">
                                                    {category.name}
                                                </h3>
                                                <p className="text-sm text-text-muted font-arabic mt-1 truncate">
                                                    {category.arabicName}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs px-2 py-1 bg-tertiary rounded-lg text-text-muted">
                                                        {category.duaCount} {category.duaCount === 1 ? 'dua' : 'duas'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Back Button */}
                            <button
                                onClick={() => setHisnSelectedCategory(null)}
                                className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
                            >
                                <span className="material-symbols-outlined">arrow_back</span>
                                <span>Back to Categories</span>
                            </button>

                            {/* Category Header */}
                            {currentHisnCategory && (
                                <div className="bg-secondary border border-tertiary rounded-xl p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div
                                            className="w-16 h-16 rounded-xl flex items-center justify-center"
                                            style={{ backgroundColor: currentHisnCategory.color + '20' }}
                                        >
                                            <span className="material-symbols-outlined text-3xl" style={{ color: currentHisnCategory.color }}>
                                                {currentHisnCategory.icon}
                                            </span>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-text-primary">{currentHisnCategory.name}</h2>
                                            <p className="text-xl text-text-muted font-arabic">{currentHisnCategory.arabicName}</p>
                                            <p className="text-sm text-text-muted mt-1">{currentHisnCategory.duaCount} duas in this category</p>
                                        </div>
                                    </div>

                                    {/* Display Options */}
                                    <div className="flex flex-wrap gap-2 pt-4 border-t border-tertiary">
                                        <button
                                            onClick={() => setShowHisnTranslation(!showHisnTranslation)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                                                showHisnTranslation
                                                    ? 'bg-accent text-white'
                                                    : 'bg-tertiary text-text-secondary hover:bg-accent/20'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-lg">translate</span>
                                            Translation
                                        </button>
                                        <button
                                            onClick={() => setShowHisnTransliteration(!showHisnTransliteration)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                                                showHisnTransliteration
                                                    ? 'bg-accent text-white'
                                                    : 'bg-tertiary text-text-secondary hover:bg-accent/20'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-lg">abc</span>
                                            Transliteration
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Duas List */}
                            <div className="space-y-4">
                                {currentHisnCategoryDuas.map((dua) => (
                                    <div
                                        key={dua.id}
                                        className="bg-secondary border border-tertiary rounded-xl p-6 hover:border-accent transition-all duration-300"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                                <span className="text-sm font-bold text-accent">{dua.order}</span>
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                {/* Audio Player */}
                                                {isSupported && (
                                                    <button
                                                        onClick={() => handlePlayAudio(dua.id, dua.arabic)}
                                                        className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-all text-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">
                                                            {currentPlayingId === dua.id && isSpeaking ? 'stop' : 'volume_up'}
                                                        </span>
                                                        <span className="font-semibold">
                                                            {currentPlayingId === dua.id && isSpeaking ? 'Stop' : 'Listen'}
                                                        </span>
                                                    </button>
                                                )}

                                                {/* Arabic Text */}
                                                <div className="bg-tertiary/30 rounded-lg p-4">
                                                    <p className="dua-arabic">
                                                        {dua.arabic}
                                                    </p>
                                                </div>

                                                {/* Transliteration */}
                                                {dua.transliteration && showHisnTransliteration && (
                                                    <div className="bg-blue-500/10 rounded-lg p-4">
                                                        <p className="text-xs font-semibold text-blue-500 mb-2 uppercase tracking-wide">Transliteration:</p>
                                                        <p className="text-base text-text-secondary italic leading-relaxed">
                                                            {dua.transliteration}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Translation */}
                                                {dua.translation && showHisnTranslation && (
                                                    <div className="bg-green-500/10 rounded-lg p-4">
                                                        <p className="text-xs font-semibold text-green-500 mb-2 uppercase tracking-wide">Translation:</p>
                                                        <p className="text-base text-text-secondary leading-relaxed">
                                                            {dua.translation}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Placeholder for missing translations */}
                                                {!dua.translation && !dua.transliteration && (
                                                    <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                                                        <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-sm">info</span>
                                                            <span>English translation and transliteration coming soon</span>
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Reference */}
                                                {dua.reference && (
                                                    <div className="pt-3 border-t border-tertiary">
                                                        <p className="text-sm text-text-muted font-arabic text-right">
                                                            <span className="font-semibold">المرجع: </span>
                                                            {dua.reference}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default EnhancedDuaCollection;

