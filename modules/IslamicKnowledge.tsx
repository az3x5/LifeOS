

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { FastingLog, LearningMaterial, LearningLog, Bookmark, IslamicEvent, HabitLog, PrayerLog } from '../types';
import { surahData } from '../data/quran-data';
import { duas } from '../data/duas-data';
import { GoogleGenAI, Type } from '@google/genai';
import { gregorianToHijri, hijriToGregorian, getMajorEventsForDate } from '../utils/islamic-calendar';
import ConfirmModal from '../components/modals/ConfirmModal';


const TABS = ['Knowledge Hub', 'Prayer Tracker', 'Quran Explorer', 'Dua Collection', 'Daily Reflection'];

const IslamicKnowledge: React.FC = () => {
    const [activeTab, setActiveTab] = useState(TABS[0]);
    const [toasts, setToasts] = useState<{ id: number, message: string }[]>([]);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null>(null);

    const addToast = (message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Knowledge Hub':
                return <KnowledgeHub addToast={addToast} />;
            case 'Prayer Tracker':
                return <PrayerTracker />;
            case 'Quran Explorer':
                return <QuranExplorer />;
            case 'Dua Collection':
                return <DuaCollection />;
            case 'Daily Reflection':
                return <DailyReflection />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-text-primary">Islamic Knowledge</h1>
            <div className="border-b border-tertiary">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {TABS.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="mt-6">
                {renderTabContent()}
            </div>
            <ToastContainer toasts={toasts} />

            {confirmModal && (
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmText="Delete"
                    icon={confirmModal.icon || "🗑️"}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}
        </div>
    );
};


const KnowledgeHub: React.FC<{ addToast: (message: string) => void }> = ({ addToast }) => {
    const materials = useLiveQuery(() => db.learningMaterials.toArray(), []);
    const learningLogs = useLiveQuery(() => db.learningLogs.toArray(), []);
    const bookmarks = useLiveQuery(() => db.bookmarks.orderBy('createdAt').reverse().toArray(), []);
    
    const [selectedArticle, setSelectedArticle] = useState<LearningMaterial | null>(null);

    const bookmarkedMaterialIds = useMemo(() => new Set(bookmarks?.map(b => b.materialId) ?? []), [bookmarks]);
    const bookmarkedMaterials = useMemo(() => {
        if (!bookmarks || !materials) return [];
        const materialMap = new Map(materials.map(m => [m.id, m]));
        return bookmarks.map(b => materialMap.get(b.materialId)).filter((m): m is LearningMaterial => !!m);
    }, [bookmarks, materials]);
    
    const handleBookmarkToggle = async (materialId: number) => {
        const existing = await db.bookmarks.where({ materialId }).first();
        if (existing) {
            await db.bookmarks.delete(existing.id!);
            addToast("Bookmark removed.");
        } else {
            await db.bookmarks.add({ materialId, createdAt: new Date() });
            addToast("Article bookmarked!");
        }
    };

    const handleMarkAsRead = async () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayLog = await db.learningLogs.where({ date: todayStr }).first();
        if (!todayLog) {
            await db.learningLogs.add({ date: todayStr });
            addToast("Today's learning goal completed!");
        }
    };

    return (
        <div className="lg:flex lg:gap-8">
            <div className="flex-grow space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <LearningStreakTracker logs={learningLogs} />
                    <AISuggestions />
                </div>
                <div>
                    <h2 className="text-2xl font-bold mb-4">Learning Resources</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {materials?.map(material => (
                            <ArticleCard 
                                key={material.id} 
                                material={material} 
                                isBookmarked={bookmarkedMaterialIds.has(material.id)}
                                onRead={() => setSelectedArticle(material)} 
                                onBookmark={() => handleBookmarkToggle(material.id)} 
                            />
                        ))}
                    </div>
                </div>
            </div>
            <aside className="lg:w-80 xl:w-96 flex-shrink-0 mt-8 lg:mt-0">
                 <BookmarksPanel 
                    bookmarks={bookmarkedMaterials} 
                    onSelectArticle={setSelectedArticle}
                 />
            </aside>
            {selectedArticle && (
                <ArticleModal 
                    material={selectedArticle} 
                    onClose={() => setSelectedArticle(null)}
                    onMarkAsRead={handleMarkAsRead} 
                />
            )}
        </div>
    );
};

const LearningStreakTracker: React.FC<{ logs?: LearningLog[] }> = ({ logs }) => {
    const streaks = useMemo(() => {
        if (!logs || logs.length === 0) return { current: 0, longest: 0 };
        // FIX: Use Array.from() and cast to string array to correctly type the unique dates.
        const dates: string[] = (Array.from(new Set(logs.map(l => l.date))) as string[]).sort();
        let current = 0, longest = 0, tempStreak = 0;
        const today = new Date();
        const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
        
        if (dates.includes(today.toISOString().split('T')[0]) || dates.includes(yesterday.toISOString().split('T')[0])) {
            let lastDate = today;
            for (let i = dates.length - 1; i >= 0; i--) {
                const d = new Date(dates[i]);
                if ((lastDate.getTime() - d.getTime()) / (1000 * 3600 * 24) <= 1) {
                    current++;
                    lastDate = d;
                } else break;
            }
        }

        if (dates.length > 0) {
            longest = 1; tempStreak = 1;
            for (let i = 1; i < dates.length; i++) {
                const diff = (new Date(dates[i]).getTime() - new Date(dates[i-1]).getTime()) / (1000*3600*24);
                if (diff === 1) tempStreak++; else tempStreak = 1;
                if (tempStreak > longest) longest = tempStreak;
            }
        }
        return { current, longest };
    }, [logs]);

    return (
        <div className="bg-secondary p-5 rounded-xl border border-tertiary flex items-center gap-4">
            <span className="material-symbols-outlined text-5xl text-orange-400">local_fire_department</span>
            <div>
                <h3 className="text-xl font-bold">{streaks.current} Day Streak</h3>
                <p className="text-sm text-text-muted">Longest streak: {streaks.longest} days</p>
            </div>
        </div>
    );
};

const AISuggestions: React.FC = () => {
    const [suggestion, setSuggestion] = useState<{ title: string; description: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const getSuggestion = useCallback(async () => {
        setIsLoading(true);
        setSuggestion(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const recentFasts = await db.fastingLogs.orderBy('date').reverse().limit(2).toArray();
            const recentBookmarks = await db.bookmarks.orderBy('createdAt').reverse().limit(2).toArray();
            const bookmarkedMaterials = recentBookmarks.length > 0
                ? await db.learningMaterials.where('id').anyOf(recentBookmarks.map(b => b.materialId)).toArray()
                : [];
            
            let context = "A user is looking for a suggestion on what to learn about in Islam.";
            if (recentFasts.length > 0) context += ` They recently fasted for ${recentFasts[0].type}.`;
            if (bookmarkedMaterials.length > 0) context += ` They are interested in ${bookmarkedMaterials.map(m => m.title).join(' and ')}.`;
            
            const prompt = `${context} Suggest one specific, engaging topic. Format the response as JSON with a "title" and a "description" field.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            // Basic parsing, assuming AI returns a string that looks like JSON
            const textResponse = response.text.replace(/```json|```/g, '').trim();
            setSuggestion(JSON.parse(textResponse));
        } catch (err) {
            console.error(err);
            setSuggestion({ title: 'Explore Fiqh', description: 'Deepen your understanding of Islamic jurisprudence and its application in daily life.' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    return (
        <div className="bg-secondary p-5 rounded-xl border border-tertiary">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-semibold text-sm text-accent">AI-Powered Suggestion</h3>
                    {isLoading && <p className="text-text-muted mt-1">Thinking...</p>}
                    {suggestion && (
                        <div className="mt-1">
                            <h4 className="font-bold text-text-primary">{suggestion.title}</h4>
                            <p className="text-sm text-text-secondary">{suggestion.description}</p>
                        </div>
                    )}
                </div>
                <button onClick={getSuggestion} disabled={isLoading} className="p-2 rounded-full hover:bg-tertiary disabled:opacity-50">
                    <span className="material-symbols-outlined">refresh</span>
                </button>
            </div>
        </div>
    );
};

const ArticleCard: React.FC<{ material: LearningMaterial; isBookmarked: boolean; onRead: () => void; onBookmark: () => void; }> = ({ material, isBookmarked, onRead, onBookmark }) => (
    <div className="bg-secondary p-4 rounded-lg border border-tertiary flex flex-col">
        <span className="text-xs font-semibold uppercase text-accent">{material.category}</span>
        <h3 className="text-lg font-bold text-text-primary mt-1">{material.title}</h3>
        <p className="text-sm text-text-secondary flex-grow mt-1">{material.summary}</p>
        <div className="flex justify-between items-center mt-4">
            <button onClick={onRead} className="text-sm font-bold text-accent hover:underline">Read More</button>
            <button onClick={onBookmark} className={`p-2 rounded-full hover:bg-tertiary ${isBookmarked ? 'text-yellow-400' : 'text-text-muted'}`}>
                <span className="material-symbols-outlined">{isBookmarked ? 'bookmark' : 'bookmark_border'}</span>
            </button>
        </div>
    </div>
);

const BookmarksPanel: React.FC<{ bookmarks: LearningMaterial[]; onSelectArticle: (material: LearningMaterial) => void }> = ({ bookmarks, onSelectArticle }) => (
    <div className="bg-secondary p-4 rounded-xl border border-tertiary">
        <h3 className="text-xl font-bold mb-4">Bookmarks</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
            {bookmarks.length > 0 ? bookmarks.map(material => (
                <button key={material.id} onClick={() => onSelectArticle(material)} className="w-full text-left p-3 bg-primary rounded-lg hover:bg-tertiary">
                    <p className="font-semibold truncate">{material.title}</p>
                    <p className="text-xs text-accent uppercase font-semibold">{material.category}</p>
                </button>
            )) : <p className="text-sm text-text-muted text-center py-4">Your bookmarked articles will appear here.</p>}
        </div>
    </div>
);

const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
const parseContent = (text: string): string => {
    if (!text) return '';
    const inlineParse = (text: string) => text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    return text.split('\n').map(block => {
        if (block.startsWith('# ')) return `<h1 class="text-2xl font-bold mt-6 mb-2 text-text-primary">${inlineParse(block.substring(2))}</h1>`;
        if (block.startsWith('## ')) return `<h2 class="text-xl font-bold mt-4 mb-2 text-text-primary">${inlineParse(block.substring(3))}</h2>`;
        if (block.startsWith('### ')) return `<h3 class="text-lg font-bold mt-4 mb-2 text-text-secondary">${inlineParse(block.substring(4))}</h3>`;
        if (block.match(/^\s*-\s/)) return `<li class="ml-6 list-disc">${inlineParse(block.replace(/^\s*-\s/, ''))}</li>`;
        if (block.startsWith('> ')) return `<blockquote class="border-l-4 border-accent pl-4 italic my-4 text-text-secondary">${inlineParse(block.substring(2))}</blockquote>`;
        if (block.trim() === '') return '<br />';
        return `<p class="my-3 leading-relaxed">${inlineParse(block)}</p>`;
    }).join('');
};

const ArticleModal: React.FC<{ material: LearningMaterial; onClose: () => void; onMarkAsRead: () => void; }> = ({ material, onClose, onMarkAsRead }) => {
    const bookmark = useLiveQuery(() => db.bookmarks.where({ materialId: material.id }).first(), [material.id]);
    const [notes, setNotes] = useState(bookmark?.notes ?? '');

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNotes(e.target.value);
    };

    const saveNotes = useCallback(async () => {
        if (bookmark && notes !== bookmark.notes) {
            await db.bookmarks.update(bookmark.id!, { notes });
        }
    }, [bookmark, notes]);

    useEffect(() => {
        const handler = setTimeout(saveNotes, 1000);
        return () => clearTimeout(handler);
    }, [notes, saveNotes]);

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl w-full max-w-3xl h-[90vh] shadow-2xl border border-tertiary flex flex-col">
                <header className="p-4 border-b border-tertiary flex justify-between items-center flex-shrink-0">
                    <div>
                        <span className="text-xs font-semibold uppercase text-accent">{material.category}</span>
                        <h2 className="text-2xl font-bold">{material.title}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-tertiary text-2xl">&times;</button>
                </header>
                <div className="flex-grow overflow-y-auto p-6" dangerouslySetInnerHTML={{ __html: parseContent(material.content) }} />
                
                {bookmark && (
                    <div className="p-4 border-t border-tertiary flex-shrink-0">
                        <textarea value={notes} onChange={handleNotesChange} placeholder="Your personal notes and reflections..." className="w-full bg-primary border border-tertiary rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent h-24 resize-none"></textarea>
                    </div>
                )}

                <footer className="p-4 border-t border-tertiary flex-shrink-0 flex justify-end">
                    <button onClick={() => { onMarkAsRead(); onClose(); }} className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg">Mark as Read & Close</button>
                </footer>
            </div>
        </div>
    );
};

const QuranExplorer: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredSurahs = surahData.filter(surah =>
        surah.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        surah.transliteration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        surah.translation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <input
                type="text"
                placeholder="Search Surahs by name, transliteration, or translation..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-secondary border border-tertiary rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSurahs.map(surah => (
                    <div key={surah.id} className="bg-secondary p-4 rounded-lg border border-tertiary hover:border-accent transition-colors">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-text-primary">{surah.id}. {surah.name}</h2>
                            <p className="text-xl font-['Noto_Naskh_Arabic'] text-text-secondary">{surah.arabicName}</p>
                        </div>
                        <p className="text-sm text-text-muted">{surah.translation}</p>
                        <p className="text-xs text-text-muted mt-2">{surah.type} &bull; {surah.total_verses} verses</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DuaCollection: React.FC = () => {
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    return (
        <div className="space-y-4">
            {duas.map(category => (
                <div key={category.category} className="bg-secondary rounded-lg border border-tertiary overflow-hidden">
                    <button
                        onClick={() => setExpandedCategory(expandedCategory === category.category ? null : category.category)}
                        className="w-full p-4 text-left flex justify-between items-center"
                    >
                        <h2 className="text-lg font-bold">{category.category}</h2>
                        <span className={`material-symbols-outlined transition-transform ${expandedCategory === category.category ? 'rotate-90' : ''}`}>
                            chevron_right
                        </span>
                    </button>
                    {expandedCategory === category.category && (
                        <div className="p-4 border-t border-tertiary space-y-4">
                            {category.duas.map((dua, index) => (
                                <div key={index} className="p-3 bg-primary rounded-md">
                                    <p className="text-lg font-['Noto_Naskh_Arabic'] text-right leading-loose mb-2">{dua.arabic}</p>
                                    <p className="text-sm text-text-secondary italic mb-1"><strong>Transliteration:</strong> {dua.transliteration}</p>
                                    <p className="text-sm text-text-primary"><strong>Translation:</strong> {dua.translation}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

const DailyReflection: React.FC = () => {
    const [reflection, setReflection] = useState<{ ayah: string; reference: string; explanation: string; } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const todayStr = new Date().toISOString().split('T')[0];
    const dailyReflection = useLiveQuery(() => db.dailyReflections.get(todayStr), [todayStr]);

    useEffect(() => {
        const fetchReflection = async () => {
            if (dailyReflection) {
                setReflection(dailyReflection.content);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                
                const prompt = "Provide a random, inspiring Ayah from the Quran. Include its reference (Surah name and verse number). Also, provide a brief, easy-to-understand tafsir or a related hadith summary (around 50-70 words). Format the response as a JSON object with three keys: 'ayah' (the verse in English), 'reference', and 'explanation'.";

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                ayah: { type: Type.STRING, description: "The English translation of the Quranic verse." },
                                reference: { type: Type.STRING, description: "The reference, e.g., 'Surah Al-Baqarah, 2:255'." },
                                explanation: { type: Type.STRING, description: "A brief tafsir or related hadith summary." }
                            },
                            required: ['ayah', 'reference', 'explanation']
                        }
                    }
                });
                
                const jsonText = response.text.replace(/```json|```/g, '').trim();
                const jsonResponse = JSON.parse(jsonText);
                setReflection(jsonResponse);
                await db.dailyReflections.put({ date: todayStr, content: jsonResponse });
            } catch (err) {
                console.error("Error fetching daily reflection:", err);
                setError("Could not fetch a reflection today. Please check your connection or try again later.");
                setReflection({
                    ayah: "And He is with you wherever you are.",
                    reference: "Quran 57:4",
                    explanation: "This verse reminds us of Allah's constant presence and knowledge. It's a source of comfort and a call to mindfulness, knowing that we are never truly alone and are always accountable for our actions."
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchReflection();
    }, [todayStr, dailyReflection]);

    return (
        <div className="bg-secondary p-8 rounded-xl border border-tertiary text-center max-w-2xl mx-auto min-h-[250px] flex flex-col justify-center">
            <h2 className="text-2xl font-bold mb-4">Daily Reflection</h2>
            {isLoading ? (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
            ) : error && !reflection ? ( // Only show error if there's no fallback
                <p className="text-red-400">{error}</p>
            ) : reflection ? (
                <div className="animate-fade-in">
                    <blockquote className="text-xl text-text-primary italic">
                        "{reflection.ayah}"
                    </blockquote>
                    <p className="mt-2 text-text-secondary font-semibold">- {reflection.reference}</p>
                    <div className="border-t border-tertiary my-4 max-w-xs mx-auto"></div>
                    <p className="text-text-secondary text-left">{reflection.explanation}</p>
                </div>
            ) : null}
        </div>
    );
};

const PRAYERS: PrayerLog['prayer'][] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const syncPrayerHabitLog = async (prayerName: PrayerLog['prayer'], date: string, isCompleted: boolean) => {
    const integrationEnabled = (await db.settings.get('islamicHabitIntegration'))?.value;
    if (!integrationEnabled) return;

    const prayerHabit = await db.habits.where({ origin: 'system-islamic', name: prayerName }).first();
    if (!prayerHabit) return;

    const existingLog = await db.habitLogs.where({ habitId: prayerHabit.id!, date }).first();

    if (isCompleted && !existingLog) {
        await db.habitLogs.add({ habitId: prayerHabit.id!, date });
    } else if (!isCompleted && existingLog) {
        await db.habitLogs.delete(existingLog.id!);
    }
};


const PrayerTracker: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const weekStart = useMemo(() => {
        const date = new Date(currentDate);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        return new Date(date.setDate(diff));
    }, [currentDate]);

    const weekEnd = useMemo(() => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + 6);
        return date;
    }, [weekStart]);
    
    const daysOfWeek = useMemo(() => Array.from({ length: 7 }).map((_, i) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        return date;
    }), [weekStart]);

    const prayerLogs = useLiveQuery(() => db.prayerLogs.toArray(), []);

    const weeklyLogs = useMemo(() => {
        const map = new Map<string, Set<PrayerLog['prayer']>>();
        prayerLogs?.forEach(log => {
            if (!map.has(log.date)) {
                map.set(log.date, new Set());
            }
            map.get(log.date)!.add(log.prayer);
        });
        return map;
    }, [prayerLogs]);
    
    const handleTogglePrayer = async (date: Date, prayer: PrayerLog['prayer']) => {
        const dateStr = date.toISOString().split('T')[0];
        const log = await db.prayerLogs.where({ date: dateStr, prayer }).first();

        if (log) {
            await db.prayerLogs.delete(log.id!);
            await syncPrayerHabitLog(prayer, dateStr, false);
        } else {
            await db.prayerLogs.add({ date: dateStr, prayer });
            await syncPrayerHabitLog(prayer, dateStr, true);
        }
    };
    
    const stats = useMemo(() => {
        let completed = 0;
        daysOfWeek.forEach(day => {
            const dateStr = day.toISOString().split('T')[0];
            completed += weeklyLogs.get(dateStr)?.size || 0;
        });
        const total = 7 * 5;
        return {
            completed,
            total,
            percentage: total > 0 ? (completed / total) * 100 : 0
        };
    }, [daysOfWeek, weeklyLogs]);

    const changeWeek = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + offset * 7);
            return newDate;
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-secondary p-4 md:p-6 rounded-xl border border-tertiary">
                <div className="flex justify-between items-center mb-4 px-2">
                    <button onClick={() => changeWeek(-1)} className="p-2 rounded-full hover:bg-tertiary"><span className="material-symbols-outlined">chevron_left</span></button>
                    <h3 className="text-lg font-bold text-center">
                        {weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </h3>
                    <button onClick={() => changeWeek(1)} className="p-2 rounded-full hover:bg-tertiary"><span className="material-symbols-outlined">chevron_right</span></button>
                </div>
                <div className="grid grid-cols-8 gap-1 text-center">
                    <div className="p-2 font-bold"></div> {/* Empty corner */}
                    {daysOfWeek.map(day => (
                        <div key={day.toISOString()} className="p-2 font-bold text-text-secondary text-xs md:text-sm">
                            <div>{day.toLocaleDateString('default', { weekday: 'short' })}</div>
                            <div>{day.getDate()}</div>
                        </div>
                    ))}
                    {PRAYERS.map(prayer => (
                        <React.Fragment key={prayer}>
                            <div className="p-2 font-bold text-right text-text-secondary text-sm md:text-base flex items-center justify-end">{prayer}</div>
                            {daysOfWeek.map(day => {
                                const dateStr = day.toISOString().split('T')[0];
                                const isLogged = weeklyLogs.get(dateStr)?.has(prayer) ?? false;
                                return (
                                    <div key={`${dateStr}-${prayer}`} className="p-1 flex items-center justify-center">
                                        <button 
                                            onClick={() => handleTogglePrayer(day, prayer)}
                                            title={`Log ${prayer} for ${dateStr}`}
                                            className={`w-8 h-8 rounded-full border-2 transition-colors flex items-center justify-center ${isLogged ? 'bg-accent border-accent text-white' : 'border-tertiary hover:border-accent'}`}
                                        >
                                            {isLogged && <span className="material-symbols-outlined text-base">check</span>}
                                        </button>
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <aside>
                <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                     <h3 className="text-xl font-bold mb-4">Weekly Progress</h3>
                     <div className="flex justify-between items-baseline mb-2">
                        <span className="text-3xl font-bold">{stats.percentage.toFixed(0)}%</span>
                        <span className="text-text-secondary">{stats.completed}/{stats.total}</span>
                     </div>
                     <div className="w-full bg-tertiary rounded-full h-4">
                        <div className="bg-accent h-4 rounded-full" style={{ width: `${stats.percentage}%` }}></div>
                     </div>
                     <div className="mt-6 p-4 bg-primary rounded-lg">
                        <h4 className="font-semibold text-sm text-accent">AI Insight</h4>
                        <p className="text-text-secondary text-sm mt-1">
                            {stats.percentage > 70 ? "Excellent consistency! Keep up the great work." : "Focus on establishing a routine, especially for Fajr and Isha, to boost your progress."}
                        </p>
                    </div>
                </div>
            </aside>
        </div>
    );
};


const FastingTracker: React.FC<{ setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void }> = ({ setConfirmModal }) => {
    const fastingLogs = useLiveQuery(() => db.fastingLogs.toArray(), []);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const logsByDate = useMemo(() => {
        return fastingLogs?.reduce((acc, log) => {
            acc[log.date] = log;
            return acc;
        }, {} as Record<string, FastingLog>) ?? {};
    }, [fastingLogs]);

    const analytics = useMemo(() => {
        if (!fastingLogs) return { totalThisYear: 0, qadaOwed: 0, sunnahFasts: 0 };
        const currentYear = new Date().getFullYear();
        const totalThisYear = fastingLogs.filter(log => new Date(log.date).getFullYear() === currentYear && log.status === 'completed').length;
        const qadaOwed = fastingLogs.filter(log => log.type === 'qada' && log.status === 'pending').length;
        const sunnahFasts = fastingLogs.filter(log => ['shawwal', 'arafah', 'ashura', 'monday_thursday', 'voluntary'].includes(log.type) && log.status === 'completed').length;
        return { totalThisYear, qadaOwed, sunnahFasts };
    }, [fastingLogs]);

    const handleQuickAdd = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        setSelectedDate(todayStr);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
                <h2 className="text-2xl font-bold">Fasting Tracker</h2>
                <button onClick={handleQuickAdd} className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-lg text-sm">+ Quick Add Today's Fast</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Fasts This Year" value={String(analytics.totalThisYear)} />
                <StatCard title="Qada Days Owed" value={String(analytics.qadaOwed)} />
                <StatCard title="Sunnah Fasts Completed" value={String(analytics.sunnahFasts)} />
            </div>

            <div className="bg-secondary p-4 md:p-6 rounded-xl border border-tertiary">
                <CalendarHeader currentDate={currentDate} setCurrentDate={setCurrentDate} />
                <CalendarGrid currentDate={currentDate} logsByDate={logsByDate} onDayClick={setSelectedDate} />
            </div>
            
            <div className="bg-secondary p-5 rounded-xl border border-tertiary">
                <h3 className="font-semibold text-sm text-accent">AI Reflection</h3>
                <p className="text-text-secondary mt-1">
                    You've completed {analytics.sunnahFasts} Sunnah fasts. Consistency in voluntary acts is beloved by Allah. Keep up the great effort!
                </p>
            </div>
            
            {selectedDate && <AddFastLogModal date={selectedDate} existingLog={logsByDate[selectedDate]} closeModal={() => setSelectedDate(null)} setConfirmModal={setConfirmModal} />}
        </div>
    );
};

const IslamicCalendar: React.FC<{ setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void }> = ({ setConfirmModal }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const userEvents = useLiveQuery(() => db.islamicEvents.toArray(), []);

    const userEventsByDate = useMemo(() => {
        return userEvents?.reduce((acc, event) => {
            acc[event.gregorianDate] = event;
            return acc;
        }, {} as Record<string, IslamicEvent>) ?? {};
    }, [userEvents]);
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-secondary p-4 md:p-6 rounded-xl border border-tertiary">
                    <CalendarHeader currentDate={currentDate} setCurrentDate={setCurrentDate} />
                    <IslamicCalendarGrid currentDate={currentDate} userEventsByDate={userEventsByDate} onDayClick={setSelectedDate} />
                </div>
                <div className="space-y-6">
                    <DateConverter />
                </div>
            </div>
            {selectedDate && <EventModal dateStr={selectedDate} userEvent={userEventsByDate[selectedDate]} closeModal={() => setSelectedDate(null)} setConfirmModal={setConfirmModal} />}
        </div>
    );
};

const IslamicCalendarGrid: React.FC<{ currentDate: Date; userEventsByDate: Record<string, IslamicEvent>; onDayClick: (date: string) => void; }> = ({ currentDate, userEventsByDate, onDayClick }) => {
    const days = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const firstDayOfWeek = firstDayOfMonth.getDay();
        const todayStr = new Date().toISOString().split('T')[0];

        const daysArray = [];

        for (let i = 0; i < firstDayOfWeek; i++) {
            daysArray.push(<div key={`empty-${i}`} className="border-r border-b border-tertiary"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const hijri = gregorianToHijri(date);
            const majorEvents = getMajorEventsForDate(date);
            const userEvent = userEventsByDate[dateStr];
            
            const isToday = dateStr === todayStr;

            daysArray.push(
                <button key={day} onClick={() => onDayClick(dateStr)} className={`p-1.5 border-r border-b border-tertiary text-left align-top h-24 md:h-28 lg:h-32 focus:outline-none focus:ring-2 focus:ring-accent focus:z-10 relative transition-colors ${isToday ? 'bg-accent/20' : 'hover:bg-tertiary'}`}>
                    <span className={`font-semibold ${isToday ? 'text-accent' : ''}`}>{day}</span>
                    <span className="block text-xs text-text-muted">{hijri.hDay} {hijri.hMonthName}</span>
                    <div className="mt-1 space-y-1">
                        {majorEvents.map(event => <div key={event} className="w-full text-xs bg-accent/50 text-text-primary px-1 rounded truncate">{event}</div>)}
                        {userEvent && <div className="w-full text-xs bg-blue-500/50 text-text-primary px-1 rounded truncate">{userEvent.notes}</div>}
                    </div>
                </button>
            );
        }
        return daysArray;
    }, [currentDate, userEventsByDate, onDayClick]);
    
    return (
        <div className="border-t border-l border-tertiary">
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-text-secondary">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="py-2 border-r border-b border-tertiary">{day}</div>)}
            </div>
            <div className="grid grid-cols-7">
                {days}
            </div>
        </div>
    );
};

const EventModal: React.FC<{
    dateStr: string;
    userEvent?: IslamicEvent;
    closeModal: () => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({ dateStr, userEvent, closeModal, setConfirmModal }) => {
    const [notes, setNotes] = useState(userEvent?.notes ?? '');
    const date = new Date(dateStr);
    date.setUTCHours(12); // Avoid timezone issues
    const hijri = gregorianToHijri(date);
    const majorEvents = getMajorEventsForDate(date);

    const handleSave = async () => {
        if (notes.trim()) {
            await db.islamicEvents.put({ gregorianDate: dateStr, notes: notes.trim() });
        } else if (userEvent) {
            await db.islamicEvents.delete(userEvent.gregorianDate);
        }
        closeModal();
    };
    
    const handleDelete = async () => {
        if(userEvent) {
            setConfirmModal({
                isOpen: true,
                title: 'Delete Note',
                message: "Are you sure? This will delete your custom note.",
                icon: '📅',
                onConfirm: async () => {
                    await db.islamicEvents.delete(userEvent.gregorianDate);
                    setConfirmModal(null);
                    closeModal();
                }
            });
        }
    }

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary">
                <h2 className="text-xl font-bold">{date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
                <p className="text-text-secondary mb-4">{hijri.hDay} {hijri.hMonthName}, {hijri.hYear} AH</p>
                {majorEvents.length > 0 && (
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-text-muted">Major Events:</h3>
                        <ul className="list-disc list-inside text-accent">
                            {majorEvents.map(e => <li key={e}>{e}</li>)}
                        </ul>
                    </div>
                )}
                <div>
                    <label htmlFor="event-notes" className="block text-sm font-medium text-text-secondary mb-2">Your Notes</label>
                    <textarea id="event-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add a personal reminder or note..."
                        className="w-full h-24 bg-primary border border-tertiary rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"></textarea>
                </div>
                <div className="flex justify-between items-center mt-6">
                     {userEvent ? (
                        <button onClick={handleDelete} className="text-red-500 hover:underline text-sm font-medium">Delete Note</button>
                    ) : (
                        <div></div> // Placeholder
                    )}
                    <div className="flex space-x-2">
                        <button onClick={closeModal} className="bg-tertiary hover:bg-opacity-80 text-text-secondary py-2 px-6 rounded-lg">Cancel</button>
                        <button onClick={handleSave} className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg">Save</button>
                    </div>
                </div>
            </div>
        </div>
    )
};

const DateConverter: React.FC = () => {
    const [gregorianDate, setGregorianDate] = useState(new Date().toISOString().split('T')[0]);
    const [hijriResult, setHijriResult] = useState('');

    useEffect(() => {
        if (gregorianDate) {
            const date = new Date(gregorianDate);
            date.setUTCHours(12);
            const hijri = gregorianToHijri(date);
            setHijriResult(`${hijri.hDay} ${hijri.hMonthName}, ${hijri.hYear} AH`);
        } else {
            setHijriResult('');
        }
    }, [gregorianDate]);

    return (
        <div className="bg-secondary p-6 rounded-xl border border-tertiary">
            <h3 className="text-xl font-bold mb-4">Date Converter</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Gregorian Date</label>
                    <input type="date" value={gregorianDate} onChange={e => setGregorianDate(e.target.value)} className="w-full bg-primary border border-tertiary rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Hijri Date</label>
                    <div className="w-full bg-primary border border-tertiary rounded-lg p-3 text-sm min-h-[44px]">
                        {hijriResult}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string, value: string }> = ({ title, value }) => (
    <div className="bg-secondary p-5 rounded-xl border border-tertiary">
        <h3 className="text-sm text-text-secondary">{title}</h3>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
    </div>
);

const CalendarHeader: React.FC<{ currentDate: Date; setCurrentDate: (date: Date) => void; }> = ({ currentDate, setCurrentDate }) => {
    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };
    return (
        <div className="flex justify-between items-center mb-4 px-2">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-tertiary">&lt;</button>
            <h3 className="text-lg font-bold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-tertiary">&gt;</button>
        </div>
    );
};

const CalendarGrid: React.FC<{ currentDate: Date; logsByDate: Record<string, FastingLog>; onDayClick: (date: string) => void; }> = ({ currentDate, logsByDate, onDayClick }) => {
    const days = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysArray = [];

        for (let i = 0; i < firstDay; i++) {
            daysArray.push(<div key={`empty-${i}`} className="w-full pt-[100%]"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const log = logsByDate[dateStr];
            
            let colorClass = 'bg-primary hover:bg-tertiary';
            if (log) {
                if (log.status === 'completed') colorClass = 'bg-accent/70 hover:bg-accent';
                else if (log.status === 'missed') colorClass = 'bg-red-500/50 hover:bg-red-500/70';
                else if (log.status === 'pending') colorClass = 'bg-yellow-500/50 hover:bg-yellow-500/70';
            }

            daysArray.push(
                <button key={day} onClick={() => onDayClick(dateStr)} className={`relative w-full pt-[100%] rounded-md transition-colors ${colorClass}`}>
                    <span className="absolute top-1 left-2 text-xs font-semibold">{day}</span>
                </button>
            );
        }
        return daysArray;
    }, [currentDate, logsByDate, onDayClick]);
    
    return (
        <div>
            <div className="grid grid-cols-7 text-center text-xs text-text-muted mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 md:gap-2">
                {days}
            </div>
        </div>
    );
};

const syncHabitLog = async (date: string, status: FastingLog['status'], previousStatus?: FastingLog['status']) => {
    const integrationEnabled = (await db.settings.get('islamicHabitIntegration'))?.value;
    if (!integrationEnabled) return;

    const fastingHabit = await db.habits.where({ origin: 'system-islamic', name: 'Fasting' }).first();
    if (!fastingHabit) return;

    const habitLogExists = await db.habitLogs.where({ habitId: fastingHabit.id!, date }).first();

    if (status === 'completed' && !habitLogExists) {
        await db.habitLogs.add({ habitId: fastingHabit.id!, date });
    } else if (status !== 'completed' && habitLogExists) {
        if (previousStatus === 'completed' || previousStatus === undefined) {
             await db.habitLogs.delete(habitLogExists.id!);
        }
    }
};

const AddFastLogModal: React.FC<{
    date: string;
    existingLog?: FastingLog;
    closeModal: () => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({ date, existingLog, closeModal, setConfirmModal }) => {
    const [type, setType] = useState<FastingLog['type']>(existingLog?.type ?? 'voluntary');
    const [status, setStatus] = useState<FastingLog['status']>(existingLog?.status ?? 'completed');

    const handleSubmit = async () => {
        const logData = { date, type, status };
        if (existingLog) {
            await db.fastingLogs.update(existingLog.id!, logData);
        } else {
            await db.fastingLogs.add(logData);
        }
        await syncHabitLog(date, status, existingLog?.status);
        closeModal();
    };
    
    const handleDelete = async () => {
        if(existingLog) {
            setConfirmModal({
                isOpen: true,
                title: 'Delete Fasting Log',
                message: "Are you sure you want to delete this log?",
                icon: '🌙',
                onConfirm: async () => {
                    await db.fastingLogs.delete(existingLog.id!);
                    if (existingLog.status === 'completed') {
                        await syncHabitLog(date, 'missed', 'completed'); // Effectively deletes the habit log
                    }
                    setConfirmModal(null);
                    closeModal();
                }
            });
        }
    }

    const fastTypes: { value: FastingLog['type']; label: string }[] = [
        { value: 'ramadan', label: 'Ramadan' },
        { value: 'qada', label: 'Qada (Make-up)' },
        { value: 'shawwal', label: 'Shawwal' },
        { value: 'arafah', label: 'Day of Arafah' },
        { value: 'ashura', label: 'Day of Ashura' },
        { value: 'monday_thursday', label: 'Monday/Thursday' },
        { value: 'voluntary', label: 'Voluntary' },
    ];
    
    const fastStatuses: { value: FastingLog['status']; label: string }[] = [
        { value: 'completed', label: 'Completed' },
        { value: 'pending', label: 'Pending' },
        { value: 'missed', label: 'Missed' },
    ];

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary">
                <h2 className="text-2xl font-bold mb-2">Log Fast</h2>
                <p className="text-text-secondary mb-6">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Type of Fast</label>
                        <select value={type} onChange={e => setType(e.target.value as FastingLog['type'])} className="w-full bg-primary border border-tertiary rounded-lg py-3 px-3 focus:outline-none focus:ring-2 focus:ring-accent">
                            {fastTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
                         <select value={status} onChange={e => setStatus(e.target.value as FastingLog['status'])} className="w-full bg-primary border border-tertiary rounded-lg py-3 px-3 focus:outline-none focus:ring-2 focus:ring-accent">
                            {fastStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex justify-between items-center mt-6">
                    {existingLog ? (
                        <button onClick={handleDelete} className="text-red-500 hover:underline text-sm font-medium">Delete Log</button>
                    ) : (
                        <div></div> // Placeholder for alignment
                    )}
                    <div className="flex space-x-2">
                        <button onClick={closeModal} className="bg-tertiary hover:bg-opacity-80 text-text-secondary py-2 px-6 rounded-lg">Cancel</button>
                        <button onClick={handleSubmit} className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg">{existingLog ? 'Update' : 'Save'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ToastContainer: React.FC<{ toasts: { id: number, message: string }[] }> = ({ toasts }) => (
    <div className="fixed top-5 right-5 z-50 space-y-3 w-80">
        {toasts.map(toast => (
            <div key={toast.id} className="bg-secondary border border-tertiary rounded-xl shadow-lg p-4 flex items-start gap-3 animate-fade-in-up">
                <span className="material-symbols-outlined text-xl text-accent">task_alt</span>
                <p className="text-sm text-text-primary">{toast.message}</p>
            </div>
        ))}
    </div>
);


export default IslamicKnowledge;