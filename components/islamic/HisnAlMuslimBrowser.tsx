import React, { useState, useMemo } from 'react';
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
    reference: string;
    order: number;
}

const HisnAlMuslimBrowser: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [view, setView] = useState<'categories' | 'duas'>('categories');

    const categories = useMemo(() => hisnData.categories as HisnCategory[], []);
    const allDuas = useMemo(() => hisnData.duas as HisnDua[], []);

    const filteredCategories = useMemo(() => {
        if (!searchQuery) return categories;
        const query = searchQuery.toLowerCase();
        return categories.filter(cat =>
            cat.name.toLowerCase().includes(query) ||
            cat.arabicName.includes(searchQuery)
        );
    }, [categories, searchQuery]);

    const currentCategoryDuas = useMemo(() => {
        if (!selectedCategory) return [];
        return allDuas.filter(dua => dua.categoryId === selectedCategory);
    }, [allDuas, selectedCategory]);

    const currentCategory = useMemo(() => {
        return categories.find(cat => cat.id === selectedCategory);
    }, [categories, selectedCategory]);

    const handleCategoryClick = (categoryId: number) => {
        setSelectedCategory(categoryId);
        setView('duas');
    };

    const handleBackToCategories = () => {
        setView('categories');
        setSelectedCategory(null);
    };

    return (
        <div className="space-y-4">
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
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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

            {/* Categories View */}
            {view === 'categories' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCategories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => handleCategoryClick(category.id)}
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
            )}

            {/* Duas View */}
            {view === 'duas' && currentCategory && (
                <div className="space-y-4">
                    {/* Back Button */}
                    <button
                        onClick={handleBackToCategories}
                        className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                        <span>Back to Categories</span>
                    </button>

                    {/* Category Header */}
                    <div className="bg-secondary border border-tertiary rounded-xl p-6">
                        <div className="flex items-center gap-4">
                            <div
                                className="w-16 h-16 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: currentCategory.color + '20' }}
                            >
                                <span className="material-symbols-outlined text-3xl" style={{ color: currentCategory.color }}>
                                    {currentCategory.icon}
                                </span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-text-primary">{currentCategory.name}</h2>
                                <p className="text-xl text-text-muted font-arabic">{currentCategory.arabicName}</p>
                                <p className="text-sm text-text-muted mt-1">{currentCategory.duaCount} duas in this category</p>
                            </div>
                        </div>
                    </div>

                    {/* Duas List */}
                    <div className="space-y-4">
                        {currentCategoryDuas.map((dua) => (
                            <div
                                key={dua.id}
                                className="bg-secondary border border-tertiary rounded-xl p-6 hover:border-accent transition-all duration-300"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-bold text-accent">{dua.order}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xl leading-loose text-text-primary font-arabic text-right mb-4">
                                            {dua.arabic}
                                        </p>
                                        {dua.reference && (
                                            <div className="mt-4 pt-4 border-t border-tertiary">
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
                </div>
            )}
        </div>
    );
};

export default HisnAlMuslimBrowser;

