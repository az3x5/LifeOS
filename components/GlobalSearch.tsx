import React, { useState, useEffect, useCallback } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { Module, Note, Transaction, Habit } from '../types';

type SearchResult = (Note | Transaction | Habit) & { resultType: 'Note' | 'Transaction' | 'Habit' };

const GlobalSearch: React.FC<{setActiveModule: (module: Module) => void}> = ({ setActiveModule }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const allNotes = useSupabaseQuery<Note>('notes');
    const allTransactions = useSupabaseQuery<Transaction>('transactions');
    const allHabits = useSupabaseQuery<Habit>('habits');

    const performSearch = useCallback((searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([]);
            return;
        }

        const lowerCaseQuery = searchQuery.toLowerCase();

        const notes = (allNotes ?? [])
            .filter(note => (note.title?.toLowerCase().includes(lowerCaseQuery) || note.content?.toLowerCase().includes(lowerCaseQuery)))
            .slice(0, 5);

        const transactions = (allTransactions ?? [])
            .filter(t => t.description?.toLowerCase().includes(lowerCaseQuery))
            .slice(0, 5);

        const habits = (allHabits ?? [])
            .filter(h => h.name.toLowerCase().includes(lowerCaseQuery))
            .slice(0, 5);

        const combinedResults: SearchResult[] = [
            ...notes.map(n => ({ ...n, resultType: 'Note' as const })),
            ...transactions.map(t => ({ ...t, resultType: 'Transaction' as const })),
            ...habits.map(h => ({ ...h, resultType: 'Habit' as const })),
        ];

        setResults(combinedResults);
    }, [allNotes, allTransactions, allHabits]);

    useEffect(() => {
        const handler = setTimeout(() => {
            performSearch(query);
        }, 300); // Debounce search

        return () => {
            clearTimeout(handler);
        };
    }, [query, performSearch]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!(event.target instanceof Element && event.target.closest('.search-container'))) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleResultClick = (result: SearchResult) => {
        switch (result.resultType) {
            case 'Note':
                setActiveModule(Module.NOTES);
                break;
            case 'Transaction':
                setActiveModule(Module.FINANCE);
                break;
            case 'Habit':
                setActiveModule(Module.HABITS);
                break;
        }
        setQuery('');
        setResults([]);
        setIsOpen(false);
    };

    const getResultTitle = (result: SearchResult) => {
        switch(result.resultType){
            case 'Note': return (result as Note).title;
            case 'Transaction': return (result as Transaction).description;
            case 'Habit': return (result as Habit).name;
        }
    }

    return (
        <div className="relative w-full max-w-xs search-container">
            <div className="relative">
                 <input
                    type="text"
                    placeholder="Search anything..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    className="w-full bg-secondary border border-tertiary rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-text-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
            </div>

            {isOpen && query.length > 0 && (
                <div className="absolute mt-2 w-full bg-secondary rounded-xl border border-tertiary shadow-2xl z-20 max-h-96 overflow-y-auto">
                    {results.length > 0 ? (
                        <ul>
                            {results.map((result, index) => (
                                <li key={`${result.resultType}-${result.id}-${index}`} onClick={() => handleResultClick(result)}
                                    className="p-4 cursor-pointer hover:bg-tertiary/50 border-b border-tertiary last:border-b-0">
                                    <p className="font-semibold truncate text-text-primary">{getResultTitle(result)}</p>
                                    <p className="text-xs text-accent font-bold uppercase">{result.resultType}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="p-4 text-text-muted">No results for "{query}"</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
