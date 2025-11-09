import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { Habit, HabitLog, Routine, UserProfile, Badge, UserBadge } from '../types';
import { habitsService, habitLogsService, routinesService, userProfileService, badgesService, userBadgesService } from '../services/dataService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import { calculateStreaks } from '../utils/habits';
import ConfirmModal from '../components/modals/ConfirmModal';

type View = 'dashboard' | 'routinesList' | 'habitDetail' | 'routineDetail' | 'reminders' | 'progress' | 'analytics';
type SortBy = 'name' | 'streak' | 'completion' | 'category';
const TABS = ['Dashboard', 'Progress', 'Routines', 'Reminders', 'Analytics & Insights'];

const getTodayDateString = () => new Date().toISOString().split('T')[0];

type Toast = { id: number; icon: string; title: string; message: string; };
type UndoAction = { message: string; onUndo: () => void; };

const HabitTracker: React.FC = () => {
    const [view, setView] = useState<View>('dashboard');
    const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
    const [selectedRoutineId, setSelectedRoutineId] = useState<number | null>(null);
    const [isSetReminderModalOpen, setIsSetReminderModalOpen] = useState(false);
    const [selectedHabitForReminder, setSelectedHabitForReminder] = useState<Habit | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
    const undoTimeoutRef = useRef<number | null>(null);
    const [focusRoutine, setFocusRoutine] = useState<Routine | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
    const [sortBy, setSortBy] = useState<SortBy>('name');
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const habits = useSupabaseQuery<Habit>('habits');
    const habitLogs = useSupabaseQuery<HabitLog>('habit_logs');
    const routines = useSupabaseQuery<Routine>('routines');
    const userProfileArray = useSupabaseQuery<UserProfile>('user_profile');
    const userProfile = userProfileArray?.[0];
    const badges = useSupabaseQuery<Badge>('badges');
    const userBadges = useSupabaseQuery<UserBadge>('user_badges');

    const streaks = useMemo(() => calculateStreaks(habits ?? [], habitLogs ?? []), [habits, habitLogs]);

    const addToast = (toast: Omit<Toast, 'id'>) => {
        const newToast = { ...toast, id: Date.now() };
        setToasts(prev => [...prev, newToast]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== newToast.id)), 5000);
    };

    const awardXpAndCheckBadges = useCallback(async (habitId: number) => {
        if (!habits || !userProfile || !badges || !userBadges) return;
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;

        const newTotalXp = (userProfile.totalXp || 0) + habit.xp;
        await userProfileService.update(1, { totalXp: newTotalXp });

        const earnedBadgeIds = new Set(userBadges.map(ub => ub.badgeId));
        const currentStreaks = calculateStreaks([habit], habitLogs ?? []);

        for (const badge of badges) {
            if (earnedBadgeIds.has(badge.id)) continue;
            let earned = false;
            switch(badge.id) {
                case 'streak-7': case 'streak-30':
                    const requiredStreak = badge.id === 'streak-7' ? 7 : 30;
                    if ((currentStreaks[habit.id!]?.currentStreak ?? 0) >= requiredStreak) earned = true;
                    break;
                case 'completions-10': case 'completions-100':
                    const requiredCompletions = badge.id === 'completions-10' ? 10 : 100;
                    if ((habitLogs?.length ?? 0) >= requiredCompletions) earned = true;
                    break;
                case 'xp-1000': if (newTotalXp >= 1000) earned = true; break;
            }

            if (earned) {
                await userBadgesService.create({ badgeId: badge.id, earnedAt: new Date() });
                addToast({ icon: badge.icon, title: 'Badge Unlocked!', message: `You've earned the "${badge.name}" badge.` });
            }
        }
    }, [habits, userProfile, badges, userBadges, habitLogs]);

    const handleToggleHabit = useCallback(async (habit: Habit, date: string, isFromFocusMode = false) => {
        if (habit.origin === 'system-islamic') {
             addToast({ icon: 'sync_lock', title: 'System Habit', message: `"${habit.name}" is managed automatically by the Islamic Knowledge module.` });
             return;
        }
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        setUndoAction(null);

        const log = habitLogs?.find(l => l.habitId === habit.id! && l.date === date);

        if (log) {
            await habitLogsService.delete(log.id!);
            const undoFunc = async () => { await habitLogsService.create({ habitId: habit.id!, date }); };
            if (!isFromFocusMode) setUndoAction({ message: `"${habit.name}" marked incomplete.`, onUndo: undoFunc });
        } else {
            const newLog = await habitLogsService.create({ habitId: habit.id!, date });
            if (date === getTodayDateString()) {
                awardXpAndCheckBadges(habit.id!);
            }
            const undoFunc = async () => { if (newLog && newLog.id) await habitLogsService.delete(newLog.id); };
            if (!isFromFocusMode) setUndoAction({ message: `"${habit.name}" completed!`, onUndo: undoFunc });
        }

        if (!isFromFocusMode) {
            undoTimeoutRef.current = window.setTimeout(() => setUndoAction(null), 6000);
        }
    }, [awardXpAndCheckBadges, addToast, habitLogs]);

    if (view === 'habitDetail' && selectedHabitId) {
        return <HabitDetailView habitId={selectedHabitId} setView={setView} habits={habits} habitLogs={habitLogs} setConfirmModal={setConfirmModal} />;
    }
    if (view === 'routineDetail' && selectedRoutineId) {
        return <RoutineDetailView routineId={selectedRoutineId} setView={setView} habits={habits} routines={routines} />;
    }

    const activeTab = view === 'progress' ? 'Progress' : view === 'routinesList' ? 'Routines' : view === 'analytics' ? 'Analytics & Insights' : view === 'reminders' ? 'Reminders' : 'Dashboard';

    const handleTabClick = (tab: string) => {
        if (tab === 'Dashboard') setView('dashboard'); else if (tab === 'Progress') setView('progress'); else if (tab === 'Analytics & Insights') setView('analytics'); else if (tab === 'Routines') setView('routinesList'); else if (tab === 'Reminders') setView('reminders');
    }

    const renderContent = () => {
        switch (view) {
            case 'dashboard': return <DashboardTab setView={setView} setSelectedHabitId={setSelectedHabitId} habits={habits} habitLogs={habitLogs} routines={routines} onToggleHabit={(h) => handleToggleHabit(h, getTodayDateString())} onStartRoutine={setFocusRoutine} streaks={streaks} sortBy={sortBy} setSortBy={setSortBy} filterCategory={filterCategory} setFilterCategory={setFilterCategory} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />;
            case 'progress': return <ProgressTab userProfile={userProfile} badges={badges} userBadges={userBadges} />;
            case 'routinesList': return <RoutinesListView setView={setView} setSelectedRoutineId={setSelectedRoutineId} habits={habits} habitLogs={habitLogs} routines={routines} />;
            case 'reminders': return <RemindersTab habits={habits} onSetReminder={(habit) => { setSelectedHabitForReminder(habit); setIsSetReminderModalOpen(true); }} />;
            case 'analytics': return <AnalyticsAndInsightsTab habits={habits} habitLogs={habitLogs} />;
            default: return null;
        }
    };
    
    const handleNewHabit = async () => {
        const newHabit = await habitsService.create({ name: 'New Awesome Habit', frequency: 'daily', createdAt: new Date(), xp: 10, isFrozen: false, origin: 'user' });
        if (newHabit && newHabit.id) {
            setSelectedHabitId(newHabit.id);
            setView('habitDetail');
        }
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <ToastContainer toasts={toasts} setToasts={setToasts} />
            {undoAction && <UndoSnackbar message={undoAction.message} onUndo={() => { undoAction.onUndo(); setUndoAction(null); }} onDismiss={() => setUndoAction(null)} />}
            {focusRoutine && <FocusRoutineView routine={focusRoutine} habits={habits ?? []} logs={habitLogs ?? []} onToggleHabit={handleToggleHabit} onClose={() => setFocusRoutine(null)} />}

            <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
                <h1 className="text-4xl font-bold text-text-primary">Habit Tracker</h1>
                <div className="space-x-2">
                    <button onClick={handleNewHabit} className="bg-accent hover:bg-accent-hover text-white font-bold py-3 px-5 rounded-lg text-sm shadow-md transition-transform transform hover:scale-105">+ New Habit</button>
                </div>
            </div>
            
            <div className="border-b border-tertiary">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {TABS.map(tab => <button key={tab} onClick={() => handleTabClick(tab)} className={`${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base`}>{tab}</button>)}
                </nav>
            </div>
            
            <div className="mt-6">{renderContent()}</div>

            {isSetReminderModalOpen && selectedHabitForReminder && <SetReminderModal habit={selectedHabitForReminder} closeModal={() => { setIsSetReminderModalOpen(false); setSelectedHabitForReminder(null); }} />}
            {confirmModal && (
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmText="Delete"
                    icon="🗑️"
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}
        </div>
    );
};

const DashboardTab: React.FC<{ setView: (view: View) => void; setSelectedHabitId: (id: number) => void; habits?: Habit[]; habitLogs?: HabitLog[]; routines?: Routine[]; onToggleHabit: (habit: Habit) => void; onStartRoutine: (routine: Routine) => void; streaks: { [id: number]: { currentStreak: number; longestStreak: number; }; }; sortBy: SortBy; setSortBy: (sort: SortBy) => void; filterCategory: string | null; setFilterCategory: (cat: string | null) => void; searchQuery: string; setSearchQuery: (q: string) => void; }> = ({ setView, setSelectedHabitId, habits, habitLogs, routines, onToggleHabit, onStartRoutine, streaks, sortBy, setSortBy, filterCategory, setFilterCategory, searchQuery, setSearchQuery }) => {
    const todayStr = getTodayDateString();
    const todayDay = new Date().getDay();
    const completedHabitIds = useMemo(() => new Set(habitLogs?.filter(l => l.date === todayStr).map(l => l.habitId) ?? []), [habitLogs, todayStr]);

    const todaysHabits = useMemo(() => {
        let filtered = habits?.filter(h => h.frequency === 'daily' || h.daysOfWeek?.includes(todayDay)) ?? [];

        // Apply category filter
        if (filterCategory) {
            filtered = filtered.filter(h => h.category === filterCategory);
        }

        // Apply search query
        if (searchQuery) {
            filtered = filtered.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        // Apply sorting
        return filtered.sort((a, b) => {
            switch (sortBy) {
                case 'streak':
                    return (streaks[b.id!]?.currentStreak ?? 0) - (streaks[a.id!]?.currentStreak ?? 0);
                case 'completion':
                    const aCompleted = completedHabitIds.has(a.id!);
                    const bCompleted = completedHabitIds.has(b.id!);
                    return (bCompleted ? 1 : 0) - (aCompleted ? 1 : 0);
                case 'category':
                    return (a.category || '').localeCompare(b.category || '');
                case 'name':
                default:
                    return a.name.localeCompare(b.name);
            }
        });
    }, [habits, todayDay, filterCategory, searchQuery, sortBy, streaks, completedHabitIds]);

    const dashboardData = useMemo(() => {
        const totalCompletions = completedHabitIds.size;
        const totalHabits = todaysHabits.length;
        const completionRate = totalHabits > 0 ? (totalCompletions / totalHabits) * 100 : 0;
        // FIX: Explicitly cast streak object `s` to access its properties, as Object.values may return `unknown[]`.
        const streakValues = Object.values(streaks) as { currentStreak: number; longestStreak: number; }[];
        const activeStreaks = streakValues.filter(s => s.currentStreak > 0).length;
        const longestStreak = Math.max(0, ...streakValues.map(s => s.longestStreak));
        return { completionRate, activeStreaks, longestStreak };
    }, [completedHabitIds, todaysHabits, streaks]);

    const { routinesWithHabits, standaloneHabits } = useMemo(() => {
        if (!routines || !habits) return { routinesWithHabits: [], standaloneHabits: [] };
        const habitMap = new Map(habits.map(h => [h.id!, h]));
        const habitsInRoutines = new Set<number>();
        const routinesWithHabits = routines.map(routine => {
            const routineHabits = routine.habitIds.map(id => habitMap.get(id)).filter((h): h is Habit => h !== undefined && todaysHabits.some(th => th.id === h.id));
            routineHabits.forEach(h => habitsInRoutines.add(h.id!));
            return { ...routine, habits: routineHabits };
        }).filter(r => r.habits.length > 0);
        const standaloneHabits = todaysHabits.filter(h => !habitsInRoutines.has(h.id!));
        return { routinesWithHabits, standaloneHabits };
    }, [routines, habits, todaysHabits]);

    if (todaysHabits.length === 0) {
        return <EmptyState icon="deck" title="No Habits Today" message="You have no habits scheduled for today. Ready to add one?" ctaText="+ New Habit" onCtaClick={async () => {
            const newHabit = await habitsService.create({ name: 'New Awesome Habit', frequency: 'daily', createdAt: new Date(), xp: 10, isFrozen: false });
            if (newHabit && newHabit.id) {
                setSelectedHabitId(newHabit.id);
                setView('habitDetail');
            }
        }} />;
    }

    const categories = useMemo(() => [...new Set(habits?.map(h => h.category).filter(Boolean) ?? [])], [habits]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Today's Completion" value={`${dashboardData.completionRate.toFixed(0)}%`} />
                <StatCard title="Active Streaks" value={dashboardData.activeStreaks.toString()} />
                <StatCard title="Longest Streak" value={`${dashboardData.longestStreak} days`} />
            </div>

            {/* Filter & Sort Controls */}
            <div className="bg-secondary p-4 rounded-xl border border-tertiary space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <input
                        type="text"
                        placeholder="Search habits..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                    />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortBy)}
                        className="bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                    >
                        <option value="name">Sort by Name</option>
                        <option value="streak">Sort by Streak</option>
                        <option value="completion">Sort by Completion</option>
                        <option value="category">Sort by Category</option>
                    </select>
                </div>
                {categories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilterCategory(null)}
                            className={`px-3 py-1 rounded-full text-sm transition-colors ${filterCategory === null ? 'bg-accent text-white' : 'bg-tertiary text-text-primary hover:bg-accent/20'}`}
                        >
                            All
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setFilterCategory(cat)}
                                className={`px-3 py-1 rounded-full text-sm transition-colors ${filterCategory === cat ? 'bg-accent text-white' : 'bg-tertiary text-text-primary hover:bg-accent/20'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {routinesWithHabits.map(routine => <RoutineGroup key={routine.id} routine={routine} completedHabitIds={completedHabitIds} onHabitClick={(id) => { setSelectedHabitId(id); setView('habitDetail'); }} onToggleHabit={onToggleHabit} onStartRoutine={onStartRoutine} streaks={streaks} />)}
                {standaloneHabits.length > 0 && (
                     <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                        <h3 className="font-bold text-lg mb-4">Other Habits</h3>
                        <div className="space-y-3">
                            {standaloneHabits.map(habit => <HabitCard key={habit.id} habit={habit} isCompleted={completedHabitIds.has(habit.id!)} streak={streaks[habit.id!]?.currentStreak ?? 0} onHabitClick={(id) => { setSelectedHabitId(id); setView('habitDetail'); }} onToggleHabit={onToggleHabit} />)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- NEW/ENHANCED COMPONENTS ---

const EmptyState: React.FC<{ icon: string; title: string; message: string; ctaText: string; onCtaClick: () => void; }> = ({ icon, title, message, ctaText, onCtaClick }) => (
    <div className="text-center py-16 px-6 bg-secondary rounded-xl border border-tertiary">
        <span className="material-symbols-outlined text-6xl text-tertiary">{icon}</span>
        <h2 className="mt-4 text-2xl font-bold text-text-primary">{title}</h2>
        <p className="mt-2 text-text-muted">{message}</p>
        <button onClick={onCtaClick} className="mt-6 bg-accent hover:bg-accent-hover text-white font-bold py-3 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105">{ctaText}</button>
    </div>
);

const HabitCard: React.FC<{ habit: Habit; isCompleted: boolean; streak: number; onHabitClick: (id: number) => void; onToggleHabit: (habit: Habit) => void; }> = ({ habit, isCompleted, streak, onHabitClick, onToggleHabit }) => {
    const [isPopped, setIsPopped] = useState(false);
    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleHabit(habit);
        if (!isCompleted) {
            setIsPopped(true);
            setTimeout(() => setIsPopped(false), 300);
        }
    };
    return (
        <div onClick={() => onHabitClick(habit.id!)} className="flex items-center p-3 bg-primary rounded-lg transition-colors hover:bg-tertiary/60 cursor-pointer group" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onHabitClick(habit.id!)}}>
            <button onClick={handleToggle} aria-label={`Mark ${habit.name} as ${isCompleted ? 'incomplete' : 'complete'}`} className={`w-10 h-10 rounded-full border-2 flex-shrink-0 flex items-center justify-center mr-4 transition-all duration-300 transform-gpu ${isCompleted ? 'bg-accent border-accent text-white scale-100' : 'border-text-muted hover:border-accent scale-90 group-hover:scale-100'} ${isPopped ? 'animate-pop' : ''}`}>
                {isCompleted && <span className="material-symbols-outlined">check</span>}
            </button>
            <div className="flex-1 flex items-center gap-2">
                <span className={`transition-colors ${isCompleted ? 'line-through text-text-muted' : 'text-text-primary'}`}>{habit.name}</span>
                {habit.origin === 'system-islamic' && <span title="Synced from Islamic module" className="material-symbols-outlined text-sm text-accent">sync_lock</span>}
                {streak > 0 && <StreakBadge streak={streak} />}
            </div>
            <span className="text-xs font-bold text-yellow-400/80 mr-2">+{habit.xp} XP</span>
        </div>
    );
};

const StreakBadge: React.FC<{ streak: number }> = ({ streak }) => (
    <div className="tooltip flex items-center gap-1 bg-tertiary px-2 py-0.5 rounded-full text-sm text-orange-400">
        <span className="material-symbols-outlined text-base">local_fire_department</span>
        <span className="font-semibold">{streak}</span>
        <span className="tooltiptext">Current Streak: {streak} day{streak > 1 ? 's' : ''}!</span>
    </div>
);

const RoutineGroup: React.FC<{ routine: Routine & { habits: Habit[] }; completedHabitIds: Set<number>, streaks: { [id: number]: { currentStreak: number; longestStreak: number; }; }; onHabitClick: (id: number) => void; onToggleHabit: (habit: Habit) => void; onStartRoutine: (routine: Routine) => void; }> = ({ routine, completedHabitIds, streaks, onHabitClick, onToggleHabit, onStartRoutine }) => {
    return (
        <div className="bg-secondary p-6 rounded-xl border border-tertiary">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">{routine.name}</h3>
                <button onClick={() => onStartRoutine(routine)} className="flex items-center gap-2 bg-accent/20 hover:bg-accent/40 text-accent font-bold py-2 px-4 rounded-lg text-sm">
                    <span className="material-symbols-outlined text-lg">play_circle</span>
                    Start
                </button>
            </div>
            <div className="space-y-3">
                {routine.habits.map(habit => <HabitCard key={habit.id} habit={habit} isCompleted={completedHabitIds.has(habit.id!)} streak={streaks[habit.id!]?.currentStreak ?? 0} onHabitClick={onHabitClick} onToggleHabit={onToggleHabit} />)}
            </div>
        </div>
    );
};

const UndoSnackbar: React.FC<{ message: string, onUndo: () => void, onDismiss: () => void }> = ({ message, onUndo, onDismiss }) => {
    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-secondary border border-tertiary rounded-xl shadow-lg p-4 flex items-center justify-between gap-4 w-11/12 max-w-md z-50 animate-fade-in-up">
            <p className="text-text-primary text-sm">{message}</p>
            <div className="flex items-center gap-2">
                <button onClick={onUndo} className="font-bold text-accent hover:underline text-sm">Undo</button>
                <button onClick={onDismiss} className="text-text-muted hover:text-text-primary">&times;</button>
            </div>
        </div>
    );
}

const FocusRoutineView: React.FC<{ routine: Routine; habits: Habit[]; logs: HabitLog[]; onClose: () => void; onToggleHabit: (habit: Habit, date: string, isFocus: boolean) => void; }> = ({ routine, habits, logs, onClose, onToggleHabit }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const todayStr = getTodayDateString();
    
    const routineHabits = useMemo(() => routine.habitIds.map(id => habits.find(h => h.id === id)).filter((h): h is Habit => !!h), [routine, habits]);
    
    const completedInRoutine = useMemo(() => {
        const completedIds = new Set(logs.filter(l => l.date === todayStr).map(l => l.habitId));
        return routineHabits.filter(h => completedIds.has(h.id!)).length;
    }, [logs, routineHabits, todayStr]);
    
    const currentHabit = routineHabits[currentIndex];
    const isCompleted = logs.some(l => l.habitId === currentHabit?.id && l.date === todayStr);

    const handleNext = () => setCurrentIndex(i => Math.min(i + 1, routineHabits.length - 1));
    const handlePrev = () => setCurrentIndex(i => Math.max(i - 1, 0));

    const handleComplete = async () => {
        if (currentHabit && !isCompleted) {
            await onToggleHabit(currentHabit, todayStr, true);
        }
        if (currentIndex < routineHabits.length - 1) {
            handleNext();
        } else {
            onClose();
        }
    };
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Enter') handleComplete();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, routineHabits.length]);

    if (!currentHabit) return null;

    return (
        <div className="fixed inset-0 bg-primary/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 animate-fade-in">
            <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-2 text-3xl">&times;</button>
            <div className="w-full max-w-lg text-center">
                <div className="mb-4">
                    <p className="text-accent font-semibold">{routine.name}</p>
                    <p className="text-text-secondary text-sm">{currentIndex + 1} of {routineHabits.length}</p>
                    <div className="w-full bg-tertiary rounded-full h-2 mt-2">
                        <div className="bg-accent h-2 rounded-full" style={{ width: `${(completedInRoutine / routineHabits.length) * 100}%` }}></div>
                    </div>
                </div>
                
                <div className="bg-secondary p-8 md:p-12 rounded-2xl border border-tertiary">
                    <h2 className={`text-3xl md:text-4xl font-bold transition-opacity duration-300 ${isCompleted ? 'line-through text-text-muted' : ''}`}>{currentHabit.name}</h2>
                    <p className="text-yellow-400 font-bold mt-2">+{currentHabit.xp} XP</p>
                </div>
                
                <button onClick={handleComplete} className={`mt-8 w-full max-w-xs py-5 rounded-xl text-2xl font-bold text-white transition-transform transform hover:scale-105 shadow-lg ${isCompleted ? 'bg-tertiary' : 'bg-accent hover:bg-accent-hover'}`}>
                    {isCompleted ? 'Next' : 'Complete'}
                </button>

                <div className="flex justify-center gap-8 mt-6">
                    <button onClick={handlePrev} disabled={currentIndex === 0} className="text-text-secondary disabled:opacity-30">Previous</button>
                    <button onClick={handleNext} disabled={currentIndex === routineHabits.length - 1} className="text-text-secondary disabled:opacity-30">Next</button>
                </div>
            </div>
        </div>
    );
};

// --- PREVIOUSLY EXISTING COMPONENTS (with minor tweaks) ---

const CompletionHeatmap: React.FC<{ logs?: HabitLog[] }> = ({ logs }) => {
    // ... same logic as before ...
    const data = useMemo(() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 180); // Approx 6 months
        const logsByDate = new Map(logs?.map(l => [l.date, l]));
        const heatmapData = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            heatmapData.push({ date: dateStr, count: logsByDate.has(dateStr) ? 1 : 0 });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return heatmapData;
    }, [logs]);

    const weeks = useMemo(() => {
        const weeks: {date: string; count: number}[][] = [];
        let currentWeek: {date: string; count: number}[] = [];
        const firstDay = data.length > 0 ? new Date(data[0].date).getDay() : 0;
        for (let i = 0; i < firstDay; i++) {
            currentWeek.push({ date: '', count: -1 });
        }
        data.forEach(day => {
            if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
            currentWeek.push(day);
        });
        if(currentWeek.length > 0) weeks.push(currentWeek);
        return weeks;
    }, [data]);
    
    return (
        <div className="flex gap-1 overflow-x-auto p-2">
            {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-rows-7 gap-1">
                    {week.map((day, dayIndex) => (
                        <div key={`${weekIndex}-${dayIndex}`} 
                             title={day.date ? `${day.count > 0 ? 'Completed on' : 'Missed on'} ${new Date(day.date).toLocaleDateString()}` : undefined}
                             className={`w-4 h-4 rounded-sm ${day.count < 0 ? 'bg-transparent' : day.count === 0 ? 'bg-tertiary' : 'bg-accent'}`}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};


// The rest of the file (ProgressTab, AnalyticsTab, etc.) remains largely the same...

const ProgressTab: React.FC<{ userProfile?: UserProfile; badges?: Badge[]; userBadges?: UserBadge[]; }> = ({ userProfile, badges, userBadges }) => {
    const earnedBadgeIds = useMemo(() => new Set(userBadges?.map(b => b.badgeId) ?? []), [userBadges]);
    const xp = userProfile?.totalXp ?? 0;
    const level = Math.floor(Math.pow(xp / 100, 0.7)) + 1;
    const currentLevelXp = 100 * Math.pow(level - 1, 1 / 0.7);
    const nextLevelXp = 100 * Math.pow(level, 1 / 0.7);
    const progress = nextLevelXp > currentLevelXp ? ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100 : 0;
    return (
        <div className="space-y-8">
            <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                <div className="flex justify-between items-center mb-2"><h2 className="text-xl font-bold">Level {level}</h2><span className="font-bold text-accent">{xp} XP</span></div>
                <div className="w-full bg-tertiary rounded-full h-4"><div className="bg-accent h-4 rounded-full text-center text-white text-xs font-bold" style={{ width: `${progress}%` }}>{progress.toFixed(0)}%</div></div>
                <p className="text-right text-sm text-text-muted mt-1">{Math.round(nextLevelXp - xp)} XP to next level</p>
            </div>
            <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                <h2 className="text-xl font-bold mb-4">Badges</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {badges?.map(badge => {
                        const isEarned = earnedBadgeIds.has(badge.id);
                        return (
                            <div key={badge.id} className={`p-4 rounded-lg text-center border ${isEarned ? 'border-accent bg-accent/10' : 'border-tertiary bg-primary'}`}>
                                <span className={`material-symbols-outlined text-5xl mx-auto ${isEarned ? 'text-accent' : 'text-text-muted'}`}>{badge.icon}</span>
                                <h3 className={`font-bold mt-2 ${isEarned ? 'text-text-primary' : 'text-text-secondary'}`}>{badge.name}</h3>
                                <p className="text-xs text-text-muted">{badge.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const AnalyticsAndInsightsTab: React.FC<{ habits?: Habit[]; habitLogs?: HabitLog[]; }> = ({ habits, habitLogs }) => {
    if (!habits || !habitLogs) return <div className="text-center p-8 text-text-muted">Loading analytics data...</div>;
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0"><h2 className="text-2xl font-bold">Analytics & Insights</h2><div className="flex items-center space-x-2"><button className="bg-tertiary text-sm py-2 px-3 rounded-lg hover:bg-opacity-80 disabled:opacity-50" disabled>Export CSV</button><button className="bg-tertiary text-sm py-2 px-3 rounded-lg hover:bg-opacity-80 disabled:opacity-50" disabled>Export PDF</button></div></div>
            <AIInsightsWidget habits={habits} habitLogs={habitLogs} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8"><WeekdayPerformanceWidget habits={habits} habitLogs={habitLogs} /><HabitPerformanceWidget habits={habits} habitLogs={habitLogs} /></div>
        </div>
    );
};

const HabitDetailView: React.FC<{
    habitId: number;
    setView: (view: View) => void;
    habits?: Habit[];
    habitLogs?: HabitLog[];
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void } | null) => void;
}> = ({ habitId, setView, habits, habitLogs, setConfirmModal }) => {
    const habit = useMemo(() => habits?.find(h => h.id === habitId), [habits, habitId]);
    const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
    const stats = useMemo(() => {
        if (!habit || !habitLogs) return { currentStreak: 0, longestStreak: 0, completionRate: 0 };
        const streaks = calculateStreaks([habit], habitLogs);
        // FIX: Explicitly define the type for streak data to avoid potential type inference issues when destructuring.
        const habitStreak: { currentStreak: number; longestStreak: number } = streaks[habit.id!] ?? { currentStreak: 0, longestStreak: 0 };
        const { currentStreak, longestStreak } = habitStreak;
        const completionRate = calculateCompletionRate(habit, habitLogs);
        return { currentStreak, longestStreak, completionRate };
    }, [habit, habitLogs]);

    if(!habit) return <div>Loading...</div>
    
    const isSystemHabit = habit.origin === 'system-islamic';
    const handleRename = async (newName: string) => { if (newName.trim() && habit.name !== newName.trim()) { await habitsService.update(habitId, { name: newName.trim() }); } };
    const handleSetXp = async (newXp: number) => { if (!isNaN(newXp) && newXp >= 0) { await habitsService.update(habitId, { xp: newXp }); } };
    const handleDeleteHabit = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Habit',
            message: `Are you sure you want to permanently delete "${habit.name}"? All its logs will also be removed.`,
            onConfirm: async () => {
                // Delete all habit logs first, then delete the habit
                const logsToDelete = habitLogs?.filter(l => l.habitId === habit.id!) ?? [];
                for (const log of logsToDelete) {
                    if (log.id) await habitLogsService.delete(log.id);
                }
                await habitsService.delete(habit.id!);
                setConfirmModal(null);
                setView('dashboard');
            }
        });
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <button onClick={() => setView('dashboard')} className="flex items-center text-accent hover:underline"><span className="material-symbols-outlined">arrow_back</span><span>Back to Dashboard</span></button>
            <input type="text" defaultValue={habit.name} onBlur={e => handleRename(e.target.value)} disabled={isSystemHabit} className="text-4xl font-bold bg-transparent border-b-2 border-tertiary focus:border-accent focus:outline-none w-full pb-2 disabled:opacity-70 disabled:cursor-not-allowed" />
            
            {isSystemHabit && (
                <div className="bg-primary p-4 rounded-lg border border-tertiary flex items-start gap-3">
                     <span className="material-symbols-outlined text-accent mt-1">sync_lock</span>
                    <p className="text-sm text-text-secondary">This is an automated habit synced from the Islamic Knowledge module. Its progress is updated automatically when you log fasts or prayers. Settings like name, XP, and freezing are managed by the system.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><StatCard title="Current Streak" value={`${stats.currentStreak} days`} /><StatCard title="Longest Streak" value={`${stats.longestStreak} days`} /><StatCard title="Overall Rate" value={`${stats.completionRate.toFixed(0)}%`} /></div>
            <div className="bg-secondary p-6 rounded-xl border border-tertiary"><h2 className="text-xl font-semibold mb-4">6-Month Completion Heatmap</h2><CompletionHeatmap logs={habitLogs?.filter(l => l.habitId === habitId)} /></div>
            <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                <h2 className="text-xl font-semibold mb-6">Settings</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div><h3 className="font-medium text-text-primary">Gamification</h3><p className="text-sm text-text-muted">Set the XP awarded for completing this habit.</p></div>
                        <div className={`flex items-center space-x-2 ${isSystemHabit ? 'opacity-50' : ''}`}><input type="number" defaultValue={habit.xp} onBlur={e => handleSetXp(parseInt(e.target.value, 10))} disabled={isSystemHabit} className="w-20 bg-primary border border-tertiary rounded-lg py-1 px-2 text-center disabled:cursor-not-allowed" /><span className="text-text-secondary">XP</span></div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div><h3 className="font-medium text-text-primary">Streak Management</h3><p className="text-sm text-text-muted">{habit.isFrozen ? `Frozen from ${habit.frozenFrom} to ${habit.frozenTo}` : "Pause this habit without breaking your streak."}</p></div>
                        <button onClick={() => setIsFreezeModalOpen(true)} disabled={isSystemHabit} className="bg-tertiary hover:bg-opacity-80 text-text-secondary font-bold py-2 px-4 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed">{habit.isFrozen ? 'Edit Freeze' : 'Freeze Streak'}</button>
                    </div>
                </div>
            </div>
            <div className="bg-red-900/20 p-6 rounded-xl border border-red-500/50">
                <h2 className="text-xl font-semibold mb-2 text-red-300">Danger Zone</h2>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-medium text-text-primary">Delete Habit</h3>
                        <p className="text-sm text-red-300/80">This action is permanent and will remove all associated logs.</p>
                    </div>
                    <button onClick={handleDeleteHabit} disabled={isSystemHabit} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed">Delete</button>
                </div>
            </div>
            {isFreezeModalOpen && <StreakFreezeModal habit={habit} closeModal={() => setIsFreezeModalOpen(false)} />}
        </div>
    );
}

const RoutinesListView: React.FC<{ setView: (view: View) => void; setSelectedRoutineId: (id: number) => void; habits?: Habit[]; habitLogs?: HabitLog[]; routines?: Routine[]; }> = ({ setView, setSelectedRoutineId, habits, habitLogs, routines }) => {
    const todayStr = getTodayDateString(); const todayDay = new Date().getDay(); const completedHabitIds = new Set(habitLogs?.filter(l => l.date === todayStr).map(l => l.habitId) ?? []);
    const handleNewRoutine = async () => { const newRoutine = await routinesService.create({ name: 'New Routine', habitIds: [] }); if (newRoutine && newRoutine.id) { setSelectedRoutineId(newRoutine.id); setView('routineDetail'); } };
    return (
        <div className="space-y-6">
             <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Manage Routines</h2><button onClick={handleNewRoutine} className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-lg text-sm">+ New Routine</button></div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {routines?.map(routine => {
                    const todaysHabitsInRoutine = routine.habitIds.filter(hid => { const habit = habits?.find(h => h.id === hid); if (!habit) return false; return habit.frequency === 'daily' || habit.daysOfWeek?.includes(todayDay); });
                    const completedToday = todaysHabitsInRoutine.filter(hid => completedHabitIds.has(hid)).length;
                    const progress = todaysHabitsInRoutine.length > 0 ? (completedToday / todaysHabitsInRoutine.length) * 100 : 0;
                    return (
                        <div key={routine.id} onClick={() => { setSelectedRoutineId(routine.id!); setView('routineDetail'); }} className="bg-secondary p-6 rounded-xl border border-tertiary cursor-pointer hover:border-accent">
                            <div className="flex justify-between items-start"><h2 className="text-xl font-bold">{routine.name}</h2>
                                <div className="w-16 h-16 relative">
                                    <svg className="w-full h-full" viewBox="0 0 36 36"><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2D4A53" strokeWidth="3" /><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#00A99D" strokeWidth="3" strokeDasharray={`${progress}, 100`} strokeLinecap="round" transform="rotate(90 18 18)" /></svg>
                                    <div className="absolute inset-0 flex items-center justify-center font-bold text-sm">{progress.toFixed(0)}%</div>
                                </div>
                            </div>
                            <p className="text-text-secondary mt-2">{todaysHabitsInRoutine.length} habits</p>
                        </div>
                    )
                })}
             </div>
        </div>
    );
};

const RoutineDetailView: React.FC<{ setView: (view: View) => void; routineId: number; habits?: Habit[]; routines?: Routine[]; }> = ({ setView, routineId, habits, routines }) => {
    const routine = routines?.find(r => r.id === routineId); const [draggedHabitId, setDraggedHabitId] = useState<number | null>(null);
    const { habitsInRoutine, availableHabits } = useMemo(() => { if (!routine || !habits) return { habitsInRoutine: [], availableHabits: [] }; const habitMap = new Map(habits.map(h => [h.id!, h])); const habitsInRoutine = routine.habitIds.map(id => habitMap.get(id)).filter((h): h is Habit => !!h); const availableHabits = habits.filter(h => !routine.habitIds.includes(h.id!)); return { habitsInRoutine, availableHabits }; }, [routine, habits]);
    const handleRename = async (newName: string) => { if (routine && newName.trim() && routine.name !== newName.trim()) { await routinesService.update(routine.id!, { name: newName.trim() }); } };
    const addHabitToRoutine = async (habitId: number) => { if (!routine) return; await routinesService.update(routine.id!, { habitIds: [...routine.habitIds, habitId] }); };
    const removeHabitFromRoutine = async (habitId: number) => { if (!routine) return; await routinesService.update(routine.id!, { habitIds: routine.habitIds.filter(id => id !== habitId) }); };
    const handleDrop = async (targetHabitId: number) => { if (!routine || draggedHabitId === null || draggedHabitId === targetHabitId) return; const currentIds = [...routine.habitIds]; const draggedIndex = currentIds.indexOf(draggedHabitId); const targetIndex = currentIds.indexOf(targetHabitId); currentIds.splice(draggedIndex, 1); currentIds.splice(targetIndex, 0, draggedHabitId); await routinesService.update(routine.id!, { habitIds: currentIds }); setDraggedHabitId(null); };
    const handleDeleteRoutine = async () => {
        if (routine && window.confirm(`Are you sure you want to delete the routine "${routine.name}"?`)) {
            await routinesService.delete(routine.id!);
            setView('routinesList');
        }
    };
    if (!routine) return <div>Loading routine...</div>;
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <button onClick={() => setView('routinesList')} className="flex items-center text-accent hover:underline"><span className="material-symbols-outlined">arrow_back</span><span>Back to Routines</span></button>
                <button onClick={handleDeleteRoutine} className="bg-red-500/20 text-red-400 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-500/40">Delete Routine</button>
            </div>
            <input type="text" defaultValue={routine.name} onBlur={(e) => handleRename(e.target.value)} className="text-3xl font-bold bg-transparent border-b-2 border-tertiary focus:border-accent focus:outline-none w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                    <h2 className="text-xl font-bold mb-4">Habits in this Routine</h2>
                    <div className="space-y-2">{habitsInRoutine.map(habit => (<div key={habit.id} draggable onDragStart={() => setDraggedHabitId(habit.id!)} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(habit.id!)} className={`flex items-center p-3 rounded-lg cursor-grab transition-all ${draggedHabitId === habit.id ? 'bg-accent/30 opacity-50' : 'bg-primary'}`}><span className="material-symbols-outlined mr-2 text-text-muted">drag_indicator</span><span className="flex-1">{habit.name}</span><button onClick={() => removeHabitFromRoutine(habit.id!)} className="text-red-500 hover:text-red-400"><span className="material-symbols-outlined">remove_circle</span></button></div>))}</div>
                </div>
                 <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                    <h2 className="text-xl font-bold mb-4">Available Habits</h2>
                     <div className="space-y-2">{availableHabits.map(habit => (<div key={habit.id} className="flex items-center p-3 bg-primary rounded-lg"><span className="flex-1">{habit.name}</span><button onClick={() => addHabitToRoutine(habit.id!)} className="text-green-500 hover:text-green-400"><span className="material-symbols-outlined">add_circle</span></button></div>))}</div>
                </div>
            </div>
        </div>
    );
};

const RemindersTab: React.FC<{ habits?: Habit[], onSetReminder: (habit: Habit) => void }> = ({ habits, onSetReminder }) => (
    <div className="bg-secondary p-6 rounded-xl border border-tertiary">
        <h2 className="text-xl font-semibold mb-4">Habit Reminders</h2>
        <p className="text-text-muted mb-6">Set time-based notifications for your habits. Make sure you've enabled notifications in the main app settings.</p>
        <div className="space-y-3">
            {habits?.map(habit => (
                <div key={habit.id} className="flex items-center justify-between p-3 bg-primary rounded-lg">
                    <div>
                        <p className="font-semibold text-text-primary">{habit.name}</p>
                        {habit.reminderEnabled && habit.reminderTime ? (<p className="text-sm text-accent flex items-center"><span className="material-symbols-outlined text-sm mr-1">notifications_active</span>Enabled at {new Date(`1970-01-01T${habit.reminderTime}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>) : (<p className="text-sm text-text-muted">No reminder set</p>)}
                    </div>
                    <button onClick={() => onSetReminder(habit)} className="bg-tertiary hover:bg-opacity-80 text-text-secondary font-bold py-2 px-4 rounded-lg text-sm">{habit.reminderEnabled ? 'Edit' : 'Set Reminder'}</button>
                </div>
            ))}
            {!habits || habits.length === 0 && <p className="text-text-muted">Create some habits first to set reminders.</p>}
        </div>
    </div>
);

const SetReminderModal: React.FC<{ habit: Habit, closeModal: () => void }> = ({ habit, closeModal }) => {
    const [enabled, setEnabled] = useState(habit.reminderEnabled ?? false); const [time, setTime] = useState(habit.reminderTime ?? '09:00');
    const handleSave = async () => { await habitsService.update(habit.id!, { reminderEnabled: enabled, reminderTime: time }); closeModal(); };
    const handleRemove = async () => { await habitsService.update(habit.id!, { reminderEnabled: false }); closeModal(); }
    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary">
                <h2 className="text-3xl font-bold mb-2">Reminder for</h2><p className="text-text-secondary mb-6">{habit.name}</p>
                <div className="space-y-5">
                    <div className="flex items-center justify-between p-4 bg-primary rounded-lg"><label htmlFor="enable-reminder" className="font-medium text-text-primary">Enable Reminder</label><Toggle enabled={enabled} setEnabled={setEnabled} /></div>
                    {enabled && (<div className="p-4 bg-primary rounded-lg"><label htmlFor="reminder-time" className="block text-sm font-medium text-text-secondary mb-2">Reminder Time</label><input id="reminder-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-tertiary border border-primary rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"/></div>)}
                    <div className="flex justify-between items-center pt-4">
                        <button type="button" onClick={handleRemove} title="Remove Reminder" className="text-red-500 hover:underline text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled={!habit.reminderEnabled}>Remove</button>
                        <div className="flex space-x-4"><button type="button" onClick={closeModal} title="Cancel" className="bg-tertiary hover:bg-opacity-80 text-text-secondary py-2 px-6 rounded-lg">Cancel</button><button type="button" onClick={handleSave} title="Save Reminder" className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg">Save</button></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- ANALYTICS WIDGETS ---
const AIInsightsWidget: React.FC<{ habits: Habit[], habitLogs: HabitLog[] }> = ({ habits, habitLogs }) => {
    const insight = useMemo(() => { if (habits.length === 0) return "Start by creating a new habit to see insights here!"; const streaks = calculateStreaks(habits, habitLogs); const bestHabit = habits.reduce((best, current) => { const bestStreak = streaks[best.id!]?.longestStreak ?? 0; const currentStreak = streaks[current.id!]?.longestStreak ?? 0; return currentStreak > bestStreak ? current : best; }, habits[0]); const weekdayData = calculateWeekdayData(habits, habitLogs); const bestDay = weekdayData.reduce((best, current) => current.rate > best.rate ? current : best); return `Your most consistent habit is **"${bestHabit.name}"** with a longest streak of **${streaks[bestHabit.id!]?.longestStreak} days**. You're most successful on **${bestDay.name}s**, with a **${bestDay.rate.toFixed(0)}%** completion rate. Keep up the great work!`; }, [habits, habitLogs]);
    return (<div className="bg-secondary p-5 rounded-xl border border-tertiary"><h3 className="font-semibold text-sm text-accent">AI-Powered Insights</h3><p className="text-text-secondary mt-1" dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p></div>);
};
const WeekdayPerformanceWidget: React.FC<{ habits: Habit[], habitLogs: HabitLog[] }> = ({ habits, habitLogs }) => {
    const data = useMemo(() => calculateWeekdayData(habits, habitLogs), [habits, habitLogs]);
    return (
        <div className="bg-secondary p-6 rounded-xl border border-tertiary h-[400px]">
            <h2 className="text-xl font-semibold mb-4">Weekday Performance</h2>
            <ResponsiveContainer width="100%" height="90%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="rgba(224, 242, 241, 0.1)" /><XAxis dataKey="name" stroke="#B2DFDB" fontSize={12} /><YAxis stroke="#B2DFDB" fontSize={12} unit="%" /><Tooltip contentStyle={{ backgroundColor: '#1A2E35', border: '1px solid #2D4A53' }} /><Bar dataKey="rate" name="Completion Rate" fill="#00A99D" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
        </div>
    );
};
const HabitPerformanceWidget: React.FC<{ habits: Habit[], habitLogs: HabitLog[] }> = ({ habits, habitLogs }) => {
    const data = useMemo(() => {
        const streaks = calculateStreaks(habits, habitLogs);
        return habits.map(h => ({ name: h.name, 'Current Streak': streaks[h.id!]?.currentStreak ?? 0, 'Longest Streak': streaks[h.id!]?.longestStreak ?? 0, 'Completion Rate': calculateCompletionRate(h, habitLogs) }));
    }, [habits, habitLogs]);
    return (
        <div className="bg-secondary p-6 rounded-xl border border-tertiary h-[400px] flex flex-col"><h2 className="text-xl font-semibold mb-4">Habit Performance Breakdown</h2><div className="flex-1 overflow-y-auto"><ul className="space-y-3">{data.map(h => (<li key={h.name} className="p-3 bg-primary rounded-lg"> <p className="font-semibold text-text-primary">{h.name}</p><div className="flex justify-between items-center text-sm text-text-secondary mt-1"><span>Current: {h['Current Streak']}d</span><span>Longest: {h['Longest Streak']}d</span><span>Rate: {h['Completion Rate'].toFixed(0)}%</span></div></li>))}</ul></div></div>
    );
};

// --- MODALS ---

const StreakFreezeModal: React.FC<{ habit: Habit, closeModal: () => void }> = ({ habit, closeModal }) => {
    const fromStr = typeof habit.frozenFrom === 'string' ? habit.frozenFrom : (habit.frozenFrom ? new Date(habit.frozenFrom).toISOString().split('T')[0] : '');
    const toStr = typeof habit.frozenTo === 'string' ? habit.frozenTo : (habit.frozenTo ? new Date(habit.frozenTo).toISOString().split('T')[0] : '');
    const [from, setFrom] = useState(fromStr); const [to, setTo] = useState(toStr);
    const handleSave = async () => { await habitsService.update(habit.id!, { isFrozen: true, frozenFrom: from, frozenTo: to }); closeModal(); };
    const handleUnfreeze = async () => { await habitsService.update(habit.id!, { isFrozen: false, frozenFrom: undefined, frozenTo: undefined }); closeModal(); };
    return (<div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary"><h2 className="text-2xl font-bold mb-6">Freeze Streak for "{habit.name}"</h2><div className="grid grid-cols-2 gap-4"><label className="block text-sm font-medium text-text-secondary mb-2">From</label><label className="block text-sm font-medium text-text-secondary mb-2">To</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent" /><input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent" /></div><div className="flex justify-between items-center mt-6"><button onClick={handleUnfreeze} disabled={!habit.isFrozen} className="text-red-500 hover:underline disabled:opacity-50 text-sm">Unfreeze</button><div className="space-x-2"><button onClick={closeModal} className="bg-tertiary text-text-secondary font-bold py-2 px-4 rounded-lg">Cancel</button><button onClick={handleSave} className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-lg">Save</button></div></div></div></div>);
};

// --- UTILITY FUNCTIONS ---
const calculateCompletionRate = (habit: Habit, logs: HabitLog[]): number => {
    const habitLogs = logs.filter(l => l.habitId === habit.id);
    const firstLogDate = habitLogs.length > 0 ? new Date(habitLogs[0].date) : new Date();
    // FIX: Add explicit string types to sort callback to resolve 'new Date' error.
    const sortedLogs = habitLogs.sort((a: HabitLog, b: HabitLog) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const startDate = new Date(sortedLogs[0]?.date || new Date());
    const totalDays = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
    if (totalDays <= 0) return 0;
    return (habitLogs.length / totalDays) * 100;
};
const calculateWeekdayData = (habits: Habit[], logs: HabitLog[]): { name: string; rate: number }[] => {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = weekdays.map((name, i) => {
        const scheduledCount = logs.filter(log => { const day = new Date(log.date).getDay(); const habit = habits.find(h => h.id === log.habitId); return day === i && (habit?.frequency === 'daily' || habit?.daysOfWeek?.includes(i)); }).length;
        const completedCount = logs.filter(log => new Date(log.date).getDay() === i).length;
        return { name, rate: scheduledCount > 0 ? (completedCount / scheduledCount) * 100 : 0 };
    });
    return data;
};

// --- WRAPPER & STATS ---
const ToastContainer: React.FC<{ toasts: Toast[]; setToasts: React.Dispatch<React.SetStateAction<Toast[]>>; }> = ({ toasts, setToasts }) => (
    <div className="fixed top-5 right-5 z-50 space-y-3 w-80">
        {toasts.map(toast => (
            <div key={toast.id} className="bg-secondary border border-tertiary rounded-xl shadow-lg p-4 flex items-start gap-3 animate-fade-in-up">
                <span className="material-symbols-outlined text-2xl text-accent">{toast.icon}</span>
                <div>
                    <h3 className="font-bold text-text-primary">{toast.title}</h3>
                    <p className="text-sm text-text-secondary">{toast.message}</p>
                </div>
                <button onClick={() => setToasts(p => p.filter(t => t.id !== toast.id))} className="text-text-muted hover:text-text-primary ml-auto">&times;</button>
            </div>
        ))}
    </div>
);
const StatCard: React.FC<{ title: string, value: string }> = ({ title, value }) => (<div className="bg-secondary p-6 rounded-xl border border-tertiary text-center md:text-left"><h3 className="text-base text-text-secondary">{title}</h3><p className="text-3xl font-bold text-text-primary">{value}</p></div>);
const Toggle: React.FC<{ enabled: boolean; setEnabled?: (enabled: boolean) => void, onClick?: () => void, disabled?: boolean, title?: string }> = ({ enabled, setEnabled, onClick, disabled = false, title }) => (<button onClick={() => { if(disabled) return; if(onClick) onClick(); else if(setEnabled) setEnabled(!enabled); }} disabled={disabled} title={title} className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary focus:ring-accent ${enabled ? 'bg-accent' : 'bg-tertiary'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}><span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} /></button>);

export default HabitTracker;