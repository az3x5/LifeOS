import { useState, useEffect, useCallback } from 'react';
import { islamicBookmarksService } from '../services/dataService';
import { IslamicBookmark } from '../types';

export const useIslamicBookmarks = (type?: 'quran' | 'hadith' | 'dua') => {
    const [bookmarks, setBookmarks] = useState<IslamicBookmark[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadBookmarks = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = type 
                ? await islamicBookmarksService.getByType(type)
                : await islamicBookmarksService.getAll();
            setBookmarks(data || []);
        } catch (err) {
            console.error('Error loading bookmarks:', err);
            setError('Failed to load bookmarks');
        } finally {
            setLoading(false);
        }
    }, [type]);

    useEffect(() => {
        loadBookmarks();
    }, [loadBookmarks]);

    const isBookmarked = useCallback((reference: string): boolean => {
        return bookmarks.some(b => b.reference === reference);
    }, [bookmarks]);

    const getBookmark = useCallback((reference: string): IslamicBookmark | undefined => {
        return bookmarks.find(b => b.reference === reference);
    }, [bookmarks]);

    const addBookmark = useCallback(async (bookmark: Omit<IslamicBookmark, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
        try {
            await islamicBookmarksService.create(bookmark as IslamicBookmark);
            await loadBookmarks();
            return true;
        } catch (err) {
            console.error('Error adding bookmark:', err);
            setError('Failed to add bookmark');
            return false;
        }
    }, [loadBookmarks]);

    const removeBookmark = useCallback(async (reference: string) => {
        try {
            await islamicBookmarksService.deleteByReference(reference);
            await loadBookmarks();
            return true;
        } catch (err) {
            console.error('Error removing bookmark:', err);
            setError('Failed to remove bookmark');
            return false;
        }
    }, [loadBookmarks]);

    const updateBookmark = useCallback(async (id: number, updates: Partial<IslamicBookmark>) => {
        try {
            await islamicBookmarksService.update(id, updates);
            await loadBookmarks();
            return true;
        } catch (err) {
            console.error('Error updating bookmark:', err);
            setError('Failed to update bookmark');
            return false;
        }
    }, [loadBookmarks]);

    const toggleBookmark = useCallback(async (bookmark: Omit<IslamicBookmark, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
        const existing = getBookmark(bookmark.reference);
        if (existing) {
            return await removeBookmark(bookmark.reference);
        } else {
            return await addBookmark(bookmark);
        }
    }, [getBookmark, addBookmark, removeBookmark]);

    return {
        bookmarks,
        loading,
        error,
        isBookmarked,
        getBookmark,
        addBookmark,
        removeBookmark,
        updateBookmark,
        toggleBookmark,
        refresh: loadBookmarks,
    };
};

