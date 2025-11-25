import React, { useState } from 'react';
import { useIslamicBookmarks } from '../../hooks/useIslamicBookmarks';

const IslamicBookmarksViewer: React.FC = () => {
    const [filterType, setFilterType] = useState<'all' | 'quran' | 'hadith' | 'dua'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const { bookmarks, loading, removeBookmark, updateBookmark } = useIslamicBookmarks();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editNotes, setEditNotes] = useState('');

    const filteredBookmarks = React.useMemo(() => {
        let filtered = filterType === 'all' ? bookmarks : bookmarks.filter(b => b.type === filterType);

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(b =>
                b.title.toLowerCase().includes(query) ||
                b.reference.toLowerCase().includes(query) ||
                b.content?.toLowerCase().includes(query) ||
                b.notes?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [bookmarks, filterType, searchQuery]);

    const handleEditNotes = (bookmark: any) => {
        setEditingId(bookmark.id);
        setEditNotes(bookmark.notes || '');
    };

    const handleSaveNotes = async (id: number) => {
        await updateBookmark(id, { notes: editNotes });
        setEditingId(null);
        setEditNotes('');
    };

    const handleExport = () => {
        const data = filteredBookmarks.map(b => ({
            type: b.type,
            title: b.title,
            reference: b.reference,
            content: b.content,
            notes: b.notes
        }));
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `islamic-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-secondary border border-tertiary rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-accent text-4xl">bookmarks</span>
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary">My Bookmarks</h2>
                            <p className="text-text-muted mt-1">{filteredBookmarks.length} of {bookmarks.length} bookmarks</p>
                        </div>
                    </div>
                    {bookmarks.length > 0 && (
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors"
                            title="Export bookmarks"
                        >
                            <span className="material-symbols-outlined">download</span>
                            <span className="hidden sm:inline">Export</span>
                        </button>
                    )}
                </div>

                {/* Search Bar */}
                {bookmarks.length > 0 && (
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">search</span>
                        <input
                            type="text"
                            placeholder="Search bookmarks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-tertiary border border-tertiary rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                        />
                    </div>
                )}

                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                    {['all', 'quran', 'hadith', 'dua'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type as any)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                filterType === type
                                    ? 'bg-accent text-white shadow-md'
                                    : 'bg-tertiary text-text-secondary hover:bg-accent hover:text-white'
                            }`}
                        >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bookmarks List */}
            {filteredBookmarks.length === 0 ? (
                <div className="bg-secondary border border-tertiary rounded-2xl p-12 text-center">
                    <span className="material-symbols-outlined text-text-muted text-6xl mb-4">bookmark_border</span>
                    <h3 className="text-xl font-semibold text-text-primary mb-2">No Bookmarks Yet</h3>
                    <p className="text-text-muted">
                        Start bookmarking your favorite Quran verses and Hadiths to see them here.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredBookmarks.map((bookmark) => (
                        <div
                            key={bookmark.id}
                            className="bg-secondary border border-tertiary rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
                        >
                            <div className="flex items-start gap-4">
                                {/* Type Icon */}
                                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                                    bookmark.type === 'quran' ? 'bg-green-500/20' :
                                    bookmark.type === 'hadith' ? 'bg-blue-500/20' :
                                    'bg-purple-500/20'
                                }`}>
                                    <span className={`material-symbols-outlined text-2xl ${
                                        bookmark.type === 'quran' ? 'text-green-500' :
                                        bookmark.type === 'hadith' ? 'text-blue-500' :
                                        'text-purple-500'
                                    }`}>
                                        {bookmark.type === 'quran' ? 'menu_book' :
                                         bookmark.type === 'hadith' ? 'article' :
                                         'favorite'}
                                    </span>
                                </div>

                                <div className="flex-1 space-y-3">
                                    {/* Title and Reference */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-text-primary">{bookmark.title}</h3>
                                        <p className="text-sm text-text-muted">{bookmark.reference}</p>
                                    </div>

                                    {/* Content */}
                                    {bookmark.content && (
                                        <p className={`leading-relaxed ${
                                            bookmark.type === 'quran' ? 'text-xl font-arabic text-right' : 'text-text-secondary'
                                        }`}>
                                            {bookmark.content.length > 300
                                                ? bookmark.content.substring(0, 300) + '...'
                                                : bookmark.content}
                                        </p>
                                    )}

                                    {/* Notes Section */}
                                    {editingId === bookmark.id ? (
                                        <div className="space-y-2">
                                            <textarea
                                                value={editNotes}
                                                onChange={(e) => setEditNotes(e.target.value)}
                                                placeholder="Add your notes..."
                                                className="w-full px-3 py-2 bg-tertiary border border-tertiary rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                                                rows={3}
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSaveNotes(bookmark.id!)}
                                                    className="px-3 py-1 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="px-3 py-1 bg-tertiary text-text-secondary rounded-lg text-sm hover:bg-accent hover:text-white transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : bookmark.notes ? (
                                        <div className="bg-tertiary rounded-lg p-3">
                                            <p className="text-sm text-text-secondary italic">{bookmark.notes}</p>
                                        </div>
                                    ) : null}

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pt-3 border-t border-tertiary">
                                        <button
                                            onClick={() => handleEditNotes(bookmark)}
                                            className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm bg-tertiary text-text-secondary hover:bg-accent hover:text-white transition-all"
                                        >
                                            <span className="material-symbols-outlined text-base">edit_note</span>
                                            <span>{bookmark.notes ? 'Edit Notes' : 'Add Notes'}</span>
                                        </button>
                                        <button
                                            onClick={() => removeBookmark(bookmark.reference)}
                                            className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <span className="material-symbols-outlined text-base">delete</span>
                                            <span>Remove</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default IslamicBookmarksViewer;

