import React, { useState, useMemo } from 'react';
import { islamicDataService, Hadith, HadithCollection } from '../../services/islamicDataService';
import { useIslamicBookmarks } from '../../hooks/useIslamicBookmarks';

const HadithBrowser: React.FC = () => {
    const [collection, setCollection] = useState<HadithCollection>('bukhari');
    const [searchQuery, setSearchQuery] = useState('');
    const [view, setView] = useState<'browse' | 'search'>('browse');
    const [selectedSection, setSelectedSection] = useState<number>(0);
    const [showCollectionMenu, setShowCollectionMenu] = useState(false);

    // Bookmarks hook
    const { isBookmarked, toggleBookmark } = useIslamicBookmarks('hadith');

    // Get all available collections
    const collections = useMemo(() => islamicDataService.getHadithCollections(), []);
    const currentCollectionInfo = useMemo(() =>
        collections.find(c => c.slug === collection),
        [collections, collection]
    );

    const sections = useMemo(() => {
        return islamicDataService.getHadithSections(collection);
    }, [collection]);

    const searchResults = useMemo(() => {
        if (!searchQuery || view !== 'search') return [];
        return islamicDataService.searchHadith(collection, searchQuery);
    }, [searchQuery, collection, view]);

    const currentSection = sections[selectedSection];

    const handleSearch = () => {
        if (searchQuery.trim()) {
            setView('search');
        }
    };

    const handleBackToBrowse = () => {
        setView('browse');
        setSearchQuery('');
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-secondary border border-tertiary rounded-2xl p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Collection Selector */}
                    <div className="relative w-full md:w-auto">
                        <button
                            onClick={() => setShowCollectionMenu(!showCollectionMenu)}
                            className="w-full md:w-auto px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-all duration-300 flex items-center justify-between gap-3"
                        >
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined">menu_book</span>
                                <div className="text-left">
                                    <div className="text-sm font-normal opacity-80">Collection</div>
                                    <div className="font-semibold">{currentCollectionInfo?.name}</div>
                                </div>
                            </div>
                            <span className="material-symbols-outlined">
                                {showCollectionMenu ? 'expand_less' : 'expand_more'}
                            </span>
                        </button>

                        {/* Dropdown Menu */}
                        {showCollectionMenu && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-secondary border border-tertiary rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
                                {collections.map((col) => (
                                    <button
                                        key={col.slug}
                                        onClick={() => {
                                            setCollection(col.slug);
                                            setView('browse');
                                            setSelectedSection(0);
                                            setShowCollectionMenu(false);
                                        }}
                                        className={`w-full px-4 py-3 text-left hover:bg-tertiary transition-colors border-b border-tertiary last:border-b-0 ${
                                            collection === col.slug ? 'bg-accent/10' : ''
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-semibold text-text-primary">{col.name}</div>
                                                <div className="text-sm text-text-muted font-arabic">{col.arabicName}</div>
                                                <div className="text-xs text-text-muted mt-1">{col.description}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-semibold text-accent">{col.totalHadiths.toLocaleString()}</div>
                                                <div className="text-xs text-text-muted">hadiths</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                                search
                            </span>
                            <input
                                type="text"
                                placeholder="Search hadiths..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full bg-tertiary border border-primary rounded-xl py-2 pl-10 pr-4 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/80 transition-colors"
                        >
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-secondary border border-tertiary rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-accent">{sections.length}</p>
                    <p className="text-sm text-text-muted mt-1">Sections</p>
                </div>
                <div className="bg-secondary border border-tertiary rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-500">
                        {sections.reduce((acc, s) => acc + s.hadiths.length, 0)}
                    </p>
                    <p className="text-sm text-text-muted mt-1">Total Hadiths</p>
                </div>
                <div className="bg-secondary border border-tertiary rounded-xl p-4 text-center col-span-2 md:col-span-1">
                    <p className="text-2xl font-bold text-green-500">{collection === 'bukhari' ? 'Bukhari' : 'Muslim'}</p>
                    <p className="text-sm text-text-muted mt-1">Collection</p>
                </div>
            </div>

            {view === 'search' ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleBackToBrowse}
                            className="flex items-center gap-2 text-text-secondary hover:text-accent transition-colors"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                            <span>Back to Browse</span>
                        </button>
                        <p className="text-text-muted">{searchResults.length} results found</p>
                    </div>

                    {searchResults.length === 0 ? (
                        <div className="text-center py-12 text-text-muted">
                            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">search_off</span>
                            <p>No hadiths found matching "{searchQuery}"</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {searchResults.slice(0, 50).map((hadith, index) => (
                                <div
                                    key={index}
                                    className="bg-secondary border border-tertiary rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white font-bold text-sm">
                                            {hadith.hadithnumber}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-text-primary leading-relaxed">{hadith.text}</p>
                                            {hadith.reference && (
                                                <p className="text-sm text-text-muted mt-3">
                                                    Book {hadith.reference.book}, Hadith {hadith.reference.hadith}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {searchResults.length > 50 && (
                                <p className="text-center text-text-muted">
                                    Showing first 50 results. Refine your search for more specific results.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Sections List */}
                    <div className="lg:col-span-1 bg-secondary border border-tertiary rounded-2xl p-4 max-h-[600px] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Sections</h3>
                        <div className="space-y-2">
                            {sections.map((section, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedSection(index)}
                                    className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 ${
                                        selectedSection === index
                                            ? 'bg-accent text-white'
                                            : 'bg-tertiary text-text-secondary hover:bg-accent hover:text-white'
                                    }`}
                                >
                                    <p className="font-semibold text-sm line-clamp-2">{section.metadata.name}</p>
                                    <p className="text-xs opacity-75 mt-1">{section.hadiths.length} hadiths</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Hadiths */}
                    <div className="lg:col-span-3 space-y-4">
                        {currentSection && (
                            <>
                                <div className="bg-secondary border border-tertiary rounded-2xl p-4">
                                    <h2 className="text-xl font-bold text-text-primary">{currentSection.metadata.name}</h2>
                                    <p className="text-sm text-text-muted mt-1">
                                        Section {currentSection.metadata.section} • {currentSection.hadiths.length} hadiths
                                    </p>
                                </div>

                                {currentSection.hadiths.map((hadith, index) => (
                                    <div
                                        key={index}
                                        className="bg-secondary border border-tertiary rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                {hadith.hadithnumber}
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <p className="text-text-primary leading-relaxed">{hadith.text}</p>

                                                <div className="flex items-center justify-between pt-3 border-t border-tertiary">
                                                    {hadith.reference && (
                                                        <p className="text-sm text-text-muted">
                                                            Book {hadith.reference.book}, Hadith {hadith.reference.hadith}
                                                        </p>
                                                    )}

                                                    {/* Bookmark Button */}
                                                    <button
                                                        onClick={() => {
                                                            const reference = `${collection}:${hadith.hadithnumber}`;
                                                            toggleBookmark({
                                                                type: 'hadith',
                                                                reference,
                                                                title: `${collection === 'bukhari' ? 'Sahih Bukhari' : 'Sahih Muslim'} #${hadith.hadithnumber}`,
                                                                content: hadith.text.substring(0, 200) + '...',
                                                            });
                                                        }}
                                                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm transition-all ${
                                                            isBookmarked(`${collection}:${hadith.hadithnumber}`)
                                                                ? 'bg-accent text-white'
                                                                : 'bg-tertiary text-text-secondary hover:bg-accent hover:text-white'
                                                        }`}
                                                        title={isBookmarked(`${collection}:${hadith.hadithnumber}`) ? 'Remove bookmark' : 'Add bookmark'}
                                                    >
                                                        <span className="material-symbols-outlined text-base">
                                                            {isBookmarked(`${collection}:${hadith.hadithnumber}`) ? 'bookmark' : 'bookmark_border'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HadithBrowser;

