import React, { useState, useMemo, useCallback } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { Habit, HabitLog, HabitCategory } from '../types';
import { habitsService, habitLogsService } from '../services/dataService';
import { calculateStreaks } from '../utils/habits';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ConfirmModal from '../components/modals/ConfirmModal';
import AlertModal from '../components/modals/AlertModal';

const TABS = ['Dashboard', 'All Habits', 'Active', 'Inactive'];
type SortOption = 'name' | 'streak' | 'completion' | 'created';

// --- ICONS ---
const AddIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>add</span>;
const FireIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>local_fire_department</span>;
const PauseIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>pause</span>;
const PlayIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>play_arrow</span>;
const CheckCircleIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>check_circle</span>;
const PencilIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>note_add</span>;
const TrashIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>delete</span>;
const MoreVertIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>more_vert</span>;
const TrendingUpIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>trending_up</span>;
const GridViewIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>grid_view</span>;
const ListViewIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>list</span>;
const CloseIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>close</span>;
const SearchIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>search</span>;
const CheckIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>check</span>;
const EmptyIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>inbox</span>;
const CalendarIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>calendar_today</span>;
const SortIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>sort</span>;
const FilterIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>filter_list</span>;

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const HabitTracker: React.FC = () => {
    const allHabits = useSupabaseQuery<Habit>('habits');
    const habitLogs = useSupabaseQuery<HabitLog>('habit_logs');

    const [activeTab, setActiveTab] = useState(TABS[0]);
    const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('name');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null>(null);
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; icon?: string } | null>(null);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [viewStyle, setViewStyle] = useState<'grid' | 'list'>('grid');

    const streaks = useMemo(() => calculateStreaks(allHabits ?? [], habitLogs ?? []), [allHabits, habitLogs]);

    const habitStats = useMemo(() => {
        const today = getTodayDateString();
        const totalHabits = allHabits?.length || 0;
        const activeHabits = allHabits?.filter(h => h.isActive).length || 0;
        const completedToday = allHabits?.filter(h =>
            habitLogs?.some(l => l.habitId === h.id && l.date === today)
        ).length || 0;
        const streakValues = Object.values(streaks).map((s: any) => s.longestStreak);
        const longestStreak = streakValues.length > 0 ? Math.max(...streakValues) : 0;
        const avgCompletionRate = allHabits && allHabits.length > 0
            ? Math.round(allHabits.reduce((sum, habit) => {
                const createdDate = habit.createdAt ? new Date(habit.createdAt) : new Date();
                const daysSinceCreation = Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const completedDays = habitLogs?.filter(l => l.habitId === habit.id).length || 0;
                return sum + (daysSinceCreation > 0 ? (completedDays / daysSinceCreation) * 100 : 0);
            }, 0) / allHabits.length)
            : 0;
        return { totalHabits, activeHabits, completedToday, longestStreak, avgCompletionRate };
    }, [allHabits, habitLogs, streaks]);

    const selectedHabit = useMemo(() => {
        const habit = allHabits?.find(h => h.id === selectedHabitId);
        if (habit) return habit;
        if (selectedHabitId) setSelectedHabitId(null);
        return null;
    }, [allHabits, selectedHabitId]);

    const handleNewHabit = () => {
        const newHabit: Habit = {
            name: 'Untitled Habit',
            frequency: 'daily',
            xp: 10,
            isActive: true,
            origin: 'user',
            createdAt: new Date(),
        };
        setEditingHabit(newHabit);
        setIsEditModalOpen(true);
    };

    const handleSelectHabit = (id: number | null) => {
        setSelectedHabitId(id);
    };

    const handleSaveHabit = async (habit: Habit) => {
        try {
            if (habit.id) {
                await habitsService.update(habit.id, habit);
            } else {
                const newHabit = await habitsService.create(habit);
                if (newHabit && newHabit.id) {
                    handleSelectHabit(newHabit.id);
                }
            }
        } catch (error) {
            console.error('Error saving habit:', error);
            setAlertModal({
                isOpen: true,
                title: 'Error',
                message: `Failed to save habit: ${error instanceof Error ? error.message : 'Unknown error'}`,
                icon: '⚠️'
            });
        }
    };

    const calculateCompletionRate = useCallback((habit: Habit) => {
        const createdDate = habit.createdAt ? new Date(habit.createdAt) : new Date();
        const daysSinceCreation = Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const completedDays = habitLogs?.filter(l => l.habitId === habit.id).length || 0;
        return daysSinceCreation > 0 ? Math.round((completedDays / daysSinceCreation) * 100) : 0;
    }, [habitLogs]);

    const getFilteredHabits = useCallback((filter: string) => {
        let tempHabits = allHabits ?? [];

        switch(filter) {
            case 'Active':
                tempHabits = tempHabits.filter(h => h.isActive && h.origin !== 'system-islamic');
                break;
            case 'Inactive':
                tempHabits = tempHabits.filter(h => !h.isActive && h.origin !== 'system-islamic');
                break;
            case 'All Habits':
                tempHabits = tempHabits.filter(h => h.origin !== 'system-islamic');
                break;
            default:
                tempHabits = tempHabits.filter(h => h.origin !== 'system-islamic');
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            tempHabits = tempHabits.filter(h => h.name.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q));
        }

        // Apply category filter
        if (categoryFilter && categoryFilter !== 'all') {
            tempHabits = tempHabits.filter(h => h.category === categoryFilter);
        }

        // Apply sorting
        switch(sortBy) {
            case 'name':
                tempHabits.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'streak':
                tempHabits.sort((a, b) => (streaks[b.id!]?.currentStreak || 0) - (streaks[a.id!]?.currentStreak || 0));
                break;
            case 'completion':
                tempHabits.sort((a, b) => calculateCompletionRate(b) - calculateCompletionRate(a));
                break;
            case 'created':
                tempHabits.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                break;
        }

        return tempHabits;
    }, [allHabits, searchQuery, sortBy, categoryFilter, streaks, calculateCompletionRate]);

    const renderTabContent = () => {
        // Handle special tabs
        if (activeTab === 'Dashboard') {
            return <DashboardTab habitStats={habitStats} allHabits={allHabits} habitLogs={habitLogs} streaks={streaks} timeRange={timeRange} setTimeRange={setTimeRange} calculateCompletionRate={calculateCompletionRate} />;
        }

        // Handle habit list tabs
        const habits = getFilteredHabits(activeTab);

        return (
            <div className="mt-6">
                {/* Search, Filter and Sort Controls */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="flex-1 relative">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search habits..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-secondary border border-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <FilterIcon className="text-text-secondary" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-4 py-2 bg-secondary border border-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                            <option value="all">All Categories</option>
                            <option value="health">💪 Health</option>
                            <option value="productivity">⚡ Productivity</option>
                            <option value="learning">📚 Learning</option>
                            <option value="mindfulness">🧘 Mindfulness</option>
                            <option value="creativity">🎨 Creativity</option>
                            <option value="personal">🌟 Personal</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <SortIcon className="text-text-secondary" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="px-4 py-2 bg-secondary border border-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                            <option value="name">Name</option>
                            <option value="streak">Streak</option>
                            <option value="completion">Completion Rate</option>
                            <option value="created">Date Created</option>
                        </select>
                    </div>
                </div>

                {habits.length === 0 ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center space-y-4">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10">
                                <EmptyIcon className="text-5xl text-accent" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-text-primary mb-2">No habits yet</h2>
                                <p className="text-text-secondary mb-6 max-w-sm">Start building better habits today. Create your first habit to begin your journey.</p>
                            </div>
                            <button onClick={handleNewHabit} className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-all duration-200 font-medium">
                                <AddIcon className="text-lg" />
                                Create Your First Habit
                            </button>
                        </div>
                    </div>
                ) : viewStyle === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-5">
                        {habits.map(habit => (
                            <HabitCard
                                key={habit.id}
                                habit={habit}
                                isSelected={selectedHabitId === habit.id}
                                streak={streaks[habit.id!]?.currentStreak ?? 0}
                                isCompleted={habitLogs?.some(l => l.habitId === habit.id && l.date === getTodayDateString()) ?? false}
                                onSelect={() => handleSelectHabit(habit.id!)}
                                onEdit={() => {
                                    setEditingHabit(habit);
                                    setIsEditModalOpen(true);
                                }}
                                setConfirmModal={setConfirmModal}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3 max-w-5xl mx-auto">
                        {habits.map(habit => (
                            <HabitListItem
                                key={habit.id}
                                habit={habit}
                                isSelected={selectedHabitId === habit.id}
                                streak={streaks[habit.id!]?.currentStreak ?? 0}
                                isCompleted={habitLogs?.some(l => l.habitId === habit.id && l.date === getTodayDateString()) ?? false}
                                onSelect={() => handleSelectHabit(habit.id!)}
                                onEdit={() => {
                                    setEditingHabit(habit);
                                    setIsEditModalOpen(true);
                                }}
                                setConfirmModal={setConfirmModal}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
                <h1 className="text-4xl font-bold text-text-primary">Habits</h1>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Only show view style buttons on habit list tabs */}
                    {(activeTab === 'All Habits' || activeTab === 'Active') && (
                        <>
                            <button
                                onClick={() => setViewStyle('grid')}
                                title="Grid view"
                                className={`p-2 rounded-md ${viewStyle === 'grid' ? 'bg-accent text-white' : 'bg-tertiary text-text-secondary hover:bg-opacity-80'}`}
                            >
                                <GridViewIcon className="text-xl" />
                            </button>
                            <button
                                onClick={() => setViewStyle('list')}
                                title="List view"
                                className={`p-2 rounded-md ${viewStyle === 'list' ? 'bg-accent text-white' : 'bg-tertiary text-text-secondary hover:bg-opacity-80'}`}
                            >
                                <ListViewIcon className="text-xl" />
                            </button>
                        </>
                    )}
                    {/* Only show New Habit button on habit list tabs */}
                    {(activeTab === 'All Habits' || activeTab === 'Active' || activeTab === 'Dashboard') && (
                        <button
                            onClick={handleNewHabit}
                            className="bg-accent hover:bg-accent-hover text-white font-bold py-3 px-5 rounded-lg text-sm shadow-md transition-transform transform hover:scale-105"
                        >
                            + New Habit
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-secondary border border-tertiary rounded-2xl p-2">
                <nav className="flex space-x-2 overflow-x-auto" aria-label="Tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`${
                                activeTab === tab
                                    ? 'bg-accent text-white shadow-md'
                                    : 'bg-transparent text-text-secondary hover:bg-tertiary hover:text-text-primary'
                            } whitespace-nowrap py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex-shrink-0`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {renderTabContent()}

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
            {alertModal && (
                <AlertModal
                    isOpen={alertModal.isOpen}
                    title={alertModal.title}
                    message={alertModal.message}
                    icon={alertModal.icon || "⚠️"}
                    onClose={() => setAlertModal(null)}
                />
            )}
            {selectedHabit && (
                <HabitDetailPanel
                    habit={selectedHabit}
                    streak={streaks[selectedHabit.id!]?.currentStreak ?? 0}
                    isCompleted={habitLogs?.some(l => l.habitId === selectedHabit.id && l.date === getTodayDateString()) ?? false}
                    habitLogs={habitLogs}
                    onClose={() => setSelectedHabitId(null)}
                    onEdit={() => {
                        setEditingHabit(selectedHabit);
                        setIsEditModalOpen(true);
                    }}
                    onToggleCompletion={async () => {
                        const isCompleted = habitLogs?.some(l => l.habitId === selectedHabit.id && l.date === getTodayDateString()) ?? false;
                        const today = getTodayDateString();
                        if (isCompleted) {
                            const log = habitLogs?.find(l => l.habitId === selectedHabit.id && l.date === today);
                            if (log?.id) {
                                await habitLogsService.delete(log.id);
                            }
                        } else {
                            await habitLogsService.create({
                                habitId: selectedHabit.id!,
                                date: today,
                                completed: true,
                                createdAt: new Date(),
                            });
                        }
                    }}
                />
            )}
            {editingHabit && (
                <HabitEditModal
                    habit={editingHabit}
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingHabit(null);
                    }}
                    onSave={handleSaveHabit}
                />
            )}
        </div>
    );
};

// --- NEW TAB COMPONENTS ---

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
    <div className="bg-secondary border border-tertiary rounded-xl p-5 hover:shadow-lg transition-all duration-200">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-text-secondary text-sm mb-1">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
            <div className={`${color} opacity-20 text-5xl`}>{icon}</div>
        </div>
    </div>
);

const DashboardTab: React.FC<{
    habitStats: { totalHabits: number; activeHabits: number; completedToday: number; longestStreak: number; avgCompletionRate: number };
    allHabits?: Habit[];
    habitLogs?: HabitLog[];
    streaks: Record<number, any>;
    timeRange: '7d' | '30d' | '90d' | 'all';
    setTimeRange: (range: '7d' | '30d' | '90d' | 'all') => void;
    calculateCompletionRate: (habit: Habit) => number;
}> = ({ habitStats, allHabits, habitLogs, streaks, timeRange, setTimeRange, calculateCompletionRate }) => {
    // Calculate 7-day progress
    const last7Days = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const completed = habitLogs?.filter(l => l.date === dateStr).length || 0;
            const total = allHabits?.filter(h => h.isActive).length || 0;
            days.push({
                date: dateStr,
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                completed,
                total,
                percentage: total > 0 ? Math.round((completed / total) * 100) : 0
            });
        }
        return days;
    }, [habitLogs, allHabits]);

    // Get top 5 streaks
    const topStreaks = useMemo(() => {
        if (!allHabits) return [];
        return allHabits
            .map(h => ({ habit: h, streak: streaks[h.id!]?.currentStreak || 0 }))
            .filter(item => item.streak > 0)
            .sort((a, b) => b.streak - a.streak)
            .slice(0, 5);
    }, [allHabits, streaks]);

    // AI Insights
    const insights = useMemo(() => {
        const rate = habitStats.avgCompletionRate;
        if (rate >= 80) return { icon: '🎉', message: 'Excellent! You\'re crushing your habits!', color: 'text-green-500' };
        if (rate >= 60) return { icon: '👍', message: 'Great progress! Keep up the momentum!', color: 'text-blue-500' };
        if (rate >= 40) return { icon: '💪', message: 'You\'re building consistency. Stay focused!', color: 'text-yellow-500' };
        return { icon: '🌱', message: 'Every journey starts with a single step. You got this!', color: 'text-orange-500' };
    }, [habitStats.avgCompletionRate]);

    // Calculate completion trend for analytics
    const completionTrend = useMemo(() => {
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
        const data = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const completed = habitLogs?.filter(l => l.date === dateStr).length || 0;
            const total = allHabits?.filter(h => h.isActive).length || 1;
            data.push({
                date: dateStr,
                day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                rate: Math.round((completed / total) * 100)
            });
        }
        return data;
    }, [habitLogs, allHabits, timeRange]);

    // Calculate completion rate by habit
    const habitCompletionRates = useMemo(() => {
        if (!allHabits) return [];
        return allHabits
            .filter(h => h.isActive)
            .map(h => ({
                name: h.name.length > 20 ? h.name.substring(0, 20) + '...' : h.name,
                rate: calculateCompletionRate(h)
            }))
            .sort((a, b) => b.rate - a.rate)
            .slice(0, 10);
    }, [allHabits, calculateCompletionRate]);

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<FireIcon />} label="Total Habits" value={habitStats.totalHabits} color="text-accent" />
                <StatCard icon={<PlayIcon />} label="Active Habits" value={habitStats.activeHabits} color="text-green-500" />
                <StatCard icon={<CheckCircleIcon />} label="Completed Today" value={habitStats.completedToday} color="text-blue-500" />
                <StatCard icon={<TrendingUpIcon />} label="Longest Streak" value={`${habitStats.longestStreak} days`} color="text-purple-500" />
            </div>

            {/* 7-Day Progress Chart */}
            <div className="bg-secondary border border-tertiary rounded-xl p-6">
                <h3 className="text-xl font-bold text-text-primary mb-4">7-Day Progress</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={last7Days}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="day" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" />
                            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
                            <Legend />
                            <Bar dataKey="completed" fill="#10B981" name="Completed" />
                            <Bar dataKey="total" fill="#6366F1" name="Total" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Streaks */}
                <div className="bg-secondary border border-tertiary rounded-xl p-6">
                    <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                        <FireIcon className="text-accent" /> Top Streaks
                    </h3>
                    {topStreaks.length > 0 ? (
                        <div className="space-y-3">
                            {topStreaks.map(({ habit, streak }) => (
                                <div key={habit.id} className="flex items-center justify-between p-3 bg-primary rounded-lg">
                                    <span className="text-text-primary font-medium">{habit.name}</span>
                                    <span className="text-accent font-bold">{streak} days</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-text-secondary text-center py-8">No streaks yet. Start completing habits!</p>
                    )}
                </div>

                {/* AI Insights */}
                <div className="bg-secondary border border-tertiary rounded-xl p-6">
                    <h3 className="text-xl font-bold text-text-primary mb-4">AI Insights</h3>
                    <div className="flex items-start gap-4 p-4 bg-primary rounded-lg">
                        <span className="text-4xl">{insights.icon}</span>
                        <div>
                            <p className={`font-bold text-lg ${insights.color} mb-2`}>Completion Rate: {habitStats.avgCompletionRate}%</p>
                            <p className="text-text-secondary">{insights.message}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Analytics Section */}
            <div className="bg-secondary border border-tertiary rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-text-primary">Analytics</h3>
                    <div className="flex gap-2">
                        {(['7d', '30d', '90d', 'all'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                    timeRange === range
                                        ? 'bg-accent text-white'
                                        : 'bg-tertiary text-text-secondary hover:bg-tertiary/80'
                                }`}
                            >
                                {range === 'all' ? 'All' : range.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Completion Trend */}
                <div className="mb-6">
                    <h4 className="text-lg font-semibold text-text-primary mb-3">Completion Trend</h4>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={completionTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="day" stroke="#9CA3AF" />
                                <YAxis stroke="#9CA3AF" />
                                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
                                <Legend />
                                <Line type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={2} name="Completion Rate (%)" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Completion Rate by Habit */}
                <div>
                    <h4 className="text-lg font-semibold text-text-primary mb-3">Top 10 Habits by Completion Rate</h4>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={habitCompletionRates} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis type="number" stroke="#9CA3AF" />
                                <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={150} />
                                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
                                <Bar dataKey="rate" fill="#6366F1" name="Completion Rate (%)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HabitCard: React.FC<{
    habit: Habit;
    isSelected: boolean;
    streak: number;
    isCompleted: boolean;
    onSelect: () => void;
    onEdit: () => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({ habit, isSelected, streak, isCompleted, onSelect, onEdit, setConfirmModal }) => {
    const [showMenu, setShowMenu] = useState(false);

    const handleDelete = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Habit',
            message: `Are you sure you want to delete "${habit.name}"?`,
            icon: '🗑️',
            onConfirm: async () => {
                await habitsService.delete(habit.id!);
                setConfirmModal(null);
            }
        });
    };

    const handleToggleActive = async () => {
        await habitsService.update(habit.id!, { isActive: !habit.isActive });
    };

    const handleToggleCompletion = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const today = getTodayDateString();
        if (isCompleted) {
            const log = await habitLogsService.getAll();
            const todayLog = log?.find(l => l.habitId === habit.id && l.date === today);
            if (todayLog?.id) {
                await habitLogsService.delete(todayLog.id);
            }
        } else {
            await habitLogsService.create({
                habitId: habit.id!,
                date: today,
                completed: true,
                createdAt: new Date(),
            });
        }
    };

    return (
        <div
            onClick={(e) => {
                // Only trigger select if clicking on the card itself, not on buttons
                if ((e.target as HTMLElement).closest('button')) return;
                onSelect();
            }}
            className={`bg-secondary border-2 rounded-2xl p-4 md:p-5 cursor-pointer transition-all duration-300 hover:shadow-lg ${isSelected ? 'border-accent bg-accent/10 shadow-lg' : 'border-tertiary hover:border-accent/50 hover:shadow-md'}`}
        >
            {/* Header with title and actions */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
                    {/* Icon with color background */}
                    {habit.icon && (
                        <div
                            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                            style={{ backgroundColor: habit.color ? `${habit.color}20` : '#6366F120' }}
                        >
                            {habit.icon}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold text-base md:text-lg truncate ${!habit.isActive ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                            {habit.name}
                        </h3>
                        {habit.category && (
                            <p className="text-xs text-text-secondary mt-1">{habit.category}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {habit.isActive && (
                        <button
                            onClick={handleToggleCompletion}
                            title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                            className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-110 ${isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-tertiary text-text-secondary hover:bg-accent/20'}`}
                        >
                            <CheckCircleIcon className="text-lg" />
                        </button>
                    )}
                    <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="p-2 hover:bg-tertiary rounded-lg transition-colors">
                            <MoreVertIcon className="text-lg" />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-tertiary border border-primary rounded-lg shadow-xl z-50 w-44 overflow-hidden">
                                <button onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent hover:text-white flex items-center gap-2 transition-colors">
                                    <PencilIcon className="text-lg" /> Edit
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleToggleActive(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent hover:text-white flex items-center gap-2 transition-colors">
                                    {habit.isActive ? <PauseIcon className="text-lg" /> : <PlayIcon className="text-lg" />} {habit.isActive ? 'Pause' : 'Resume'}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-500/20 text-red-400 flex items-center gap-2 transition-colors">
                                    <TrashIcon className="text-lg" /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Description */}
            {habit.description && (
                <p className="text-sm text-text-secondary mb-3 line-clamp-2">{habit.description}</p>
            )}

            {/* Progress bar */}
            <div className="mb-3">
                <div className="h-2 bg-tertiary rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${isCompleted ? 'w-full' : 'w-1/3'}`}
                        style={{
                            background: isCompleted
                                ? 'linear-gradient(to right, #10B981, #34D399)'
                                : habit.color
                                    ? `linear-gradient(to right, ${habit.color}, ${habit.color}CC)`
                                    : 'linear-gradient(to right, #6366F1, #818CF8)'
                        }}
                    />
                </div>
            </div>

            {/* Status badges and streak */}
            <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${habit.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {habit.isActive ? 'Active' : 'Paused'}
                </span>
                {streak > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 flex items-center gap-1 font-medium">
                        <FireIcon className="text-xs" /> {streak}
                    </span>
                )}
                {isCompleted && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1 font-medium">
                        <CheckIcon className="text-xs" /> Done
                    </span>
                )}
            </div>
        </div>
    );
};

const HabitListItem: React.FC<{
    habit: Habit;
    isSelected: boolean;
    streak: number;
    isCompleted: boolean;
    onSelect: () => void;
    onEdit: () => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({ habit, isSelected, streak, isCompleted, onSelect, onEdit, setConfirmModal }) => {
    const [showMenu, setShowMenu] = useState(false);

    const handleDelete = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Habit',
            message: `Are you sure you want to delete "${habit.name}"?`,
            icon: '🗑️',
            onConfirm: async () => {
                await habitsService.delete(habit.id!);
                setConfirmModal(null);
            }
        });
    };

    const handleToggleActive = async () => {
        await habitsService.update(habit.id!, { isActive: !habit.isActive });
    };

    const handleToggleCompletion = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const today = getTodayDateString();
        if (isCompleted) {
            const log = await habitLogsService.getAll();
            const todayLog = log?.find(l => l.habitId === habit.id && l.date === today);
            if (todayLog?.id) {
                await habitLogsService.delete(todayLog.id);
            }
        } else {
            await habitLogsService.create({
                habitId: habit.id!,
                date: today,
                completed: true,
                createdAt: new Date(),
            });
        }
    };

    return (
        <div
            onClick={(e) => {
                // Only trigger select if clicking on the card itself, not on buttons
                if ((e.target as HTMLElement).closest('button')) return;
                onSelect();
            }}
            className={`bg-secondary border-2 rounded-2xl p-4 cursor-pointer transition-all duration-300 flex items-center justify-between hover:shadow-md ${isSelected ? 'border-accent bg-accent/10 shadow-md' : 'border-tertiary hover:border-accent/50'}`}
        >
            <div className="flex-1 min-w-0 flex items-center gap-4 cursor-pointer" onClick={onSelect}>
                {/* Completion indicator with custom color */}
                <div
                    className={`flex-shrink-0 w-1 h-12 rounded-full transition-all`}
                    style={{
                        backgroundColor: isCompleted
                            ? '#10B981'
                            : habit.color || '#374151'
                    }}
                />

                {/* Icon */}
                {habit.icon && (
                    <div
                        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: habit.color ? `${habit.color}20` : '#6366F120' }}
                    >
                        {habit.icon}
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className={`font-semibold flex-1 truncate ${!habit.isActive ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                            {habit.name}
                        </h3>
                        {streak > 0 && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 whitespace-nowrap flex items-center gap-1 font-medium">
                                <FireIcon className="text-xs" /> {streak}
                            </span>
                        )}
                    </div>
                    {habit.description && (
                        <p className="text-xs text-text-secondary truncate">{habit.description}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {habit.isActive && (
                    <button
                        onClick={handleToggleCompletion}
                        title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                        className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-110 ${isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-tertiary text-text-secondary hover:bg-accent/20'}`}
                    >
                        <CheckCircleIcon className="text-lg" />
                    </button>
                )}
                <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="p-2 hover:bg-tertiary rounded-lg transition-colors">
                        <MoreVertIcon className="text-lg" />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-tertiary border border-primary rounded-lg shadow-xl z-50 w-44 overflow-hidden">
                            <button onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent hover:text-white flex items-center gap-2 transition-colors">
                                <PencilIcon className="text-lg" /> Edit
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleToggleActive(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent hover:text-white flex items-center gap-2 transition-colors">
                                {habit.isActive ? <PauseIcon className="text-lg" /> : <PlayIcon className="text-lg" />} {habit.isActive ? 'Pause' : 'Resume'}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-500/20 text-red-400 flex items-center gap-2 transition-colors">
                                <TrashIcon className="text-lg" /> Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const HabitHeatmap: React.FC<{ habitId: number; habitLogs?: HabitLog[]; habitCreatedAt?: Date | string }> = ({ habitId, habitLogs, habitCreatedAt }) => {
    const [timeRange, setTimeRange] = useState<number>(90);

    const heatmapData = useMemo(() => {
        const today = new Date();
        const createdDate = habitCreatedAt ? new Date(habitCreatedAt) : null;
        const data: { date: string; count: number }[] = [];

        // Calculate days since creation
        const daysSinceCreation = createdDate
            ? Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
            : timeRange;

        // Use the minimum of selected range and days since creation
        const actualRange = Math.min(timeRange, daysSinceCreation);

        // Generate last N days based on actual range
        for (let i = actualRange - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const hasLog = habitLogs?.some(log => log.habitId === habitId && log.date === dateStr);
            data.push({ date: dateStr, count: hasLog ? 1 : 0 });
        }

        return data;
    }, [habitId, habitLogs, timeRange, habitCreatedAt]);

    // Group by weeks
    const weeks = useMemo(() => {
        const result: { date: string; count: number }[][] = [];
        for (let i = 0; i < heatmapData.length; i += 7) {
            result.push(heatmapData.slice(i, i + 7));
        }
        return result;
    }, [heatmapData]);

    // Calculate stats
    const stats = useMemo(() => {
        const completed = heatmapData.filter(d => d.count > 0).length;
        const total = heatmapData.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { completed, total, percentage };
    }, [heatmapData]);

    const timeRangeOptions = [
        { value: 15, label: '15 Days' },
        { value: 30, label: '30 Days' },
        { value: 60, label: '60 Days' },
        { value: 90, label: '90 Days' },
        { value: 180, label: '6 Months' },
        { value: 365, label: '1 Year' },
    ];

    return (
        <div className="bg-primary rounded-lg p-4 border border-tertiary">
            {/* Header with time range selector */}
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <div className="text-sm text-text-secondary">
                    <span className="font-semibold text-accent">{stats.completed}</span> of {stats.total} days ({stats.percentage}%)
                </div>
                <div className="flex gap-1 flex-wrap">
                    {timeRangeOptions.map(option => (
                        <button
                            key={option.value}
                            onClick={() => setTimeRange(option.value)}
                            className={`px-2.5 py-1 text-xs rounded-lg transition-all duration-200 font-medium ${
                                timeRange === option.value
                                    ? 'bg-accent text-white'
                                    : 'bg-tertiary text-text-secondary hover:bg-tertiary/70'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Heatmap grid */}
            <div className="overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                    {weeks.map((week, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-1">
                            {week.map((day) => {
                                return (
                                    <div
                                        key={day.date}
                                        title={`${day.date} - ${day.count > 0 ? 'Completed' : 'Not completed'}`}
                                        className={`w-4 h-4 rounded-sm transition-all duration-200 hover:scale-125 cursor-pointer ${
                                            day.count > 0
                                                ? 'bg-green-500 hover:bg-green-400'
                                                : 'bg-tertiary hover:bg-tertiary/70'
                                        }`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 text-xs text-text-secondary">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="w-4 h-4 bg-tertiary rounded-sm" />
                    <div className="w-4 h-4 bg-green-500/30 rounded-sm" />
                    <div className="w-4 h-4 bg-green-500/60 rounded-sm" />
                    <div className="w-4 h-4 bg-green-500 rounded-sm" />
                </div>
                <span>More</span>
            </div>
        </div>
    );
};

const HabitDetailPanel: React.FC<{
    habit: Habit | null;
    streak: number;
    isCompleted: boolean;
    habitLogs?: HabitLog[];
    onClose: () => void;
    onEdit: () => void;
    onToggleCompletion: () => void;
}> = ({ habit, streak, isCompleted, habitLogs, onClose, onEdit, onToggleCompletion }) => {
    const [isToggling, setIsToggling] = useState(false);

    if (!habit) return null;

    const today = getTodayDateString();

    // Calculate completion rate based on days since creation
    const completionRate = useMemo(() => {
        if (!habit.createdAt) return 0;

        const createdDate = new Date(habit.createdAt);
        const todayDate = new Date();
        const daysSinceCreation = Math.floor((todayDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // Count completed days
        const completedDays = habitLogs?.filter(l => l.habitId === habit.id).length ?? 0;

        // Calculate percentage
        return daysSinceCreation > 0 ? Math.round((completedDays / daysSinceCreation) * 100) : 0;
    }, [habit.id, habit.createdAt, habitLogs]);

    const handleToggleCompletion = async () => {
        setIsToggling(true);
        try {
            await onToggleCompletion();
        } finally {
            setIsToggling(false);
        }
    };

    const handleEdit = () => {
        onEdit();
        // Close detail panel after a short delay to allow modal to open
        setTimeout(() => onClose(), 100);
    };

    return (
        <>
            {/* Modal Overlay */}
            <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4" onClick={onClose}>
                {/* Modal Box */}
                <div
                    className="bg-secondary rounded-2xl shadow-2xl z-50 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 md:p-6 border-b border-tertiary">
                        <h2 className="text-xl font-bold text-text-primary">Habit Details</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-tertiary rounded-lg transition-colors"
                        >
                            <CloseIcon className="text-xl" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    {/* Habit Name */}
                    <div>
                        <h3 className={`text-2xl font-bold ${!habit.isActive ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                            {habit.name}
                        </h3>
                    </div>

                    {/* Status */}
                    <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${habit.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            {habit.isActive ? 'Active' : 'Paused'}
                        </span>
                        {isCompleted && (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400 flex items-center gap-1">
                                <CheckIcon className="text-sm" /> Done Today
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    {habit.description && (
                        <div>
                            <h4 className="text-sm font-semibold text-text-secondary mb-2">Description</h4>
                            <p className="text-text-primary">{habit.description}</p>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-primary rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <FireIcon className="text-orange-400 text-lg" />
                                <span className="text-sm text-text-secondary">Current Streak</span>
                            </div>
                            <p className="text-2xl font-bold text-text-primary">{streak}</p>
                        </div>
                        <div className="bg-primary rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckIcon className="text-green-400 text-lg" />
                                <span className="text-sm text-text-secondary">Completion</span>
                            </div>
                            <p className="text-2xl font-bold text-text-primary">{completionRate}%</p>
                        </div>
                    </div>

                    {/* Heatmap */}
                    <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                            <CalendarIcon className="text-lg" /> Activity Heatmap
                        </h4>
                        <HabitHeatmap habitId={habit.id!} habitLogs={habitLogs} habitCreatedAt={habit.createdAt} />
                    </div>

                    {/* Frequency */}
                    <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-2">Frequency</h4>
                        <p className="text-text-primary capitalize">{habit.frequency === 'daily' ? 'Every Day' : 'Custom Days'}</p>
                        {habit.frequency === 'custom' && habit.daysOfWeek && (
                            <div className="flex gap-2 mt-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                    <span
                                        key={idx}
                                        className={`w-8 h-8 flex items-center justify-center rounded text-xs font-medium ${
                                            habit.daysOfWeek?.includes(idx)
                                                ? 'bg-accent text-white'
                                                : 'bg-tertiary text-text-secondary'
                                        }`}
                                    >
                                        {day}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Created Date */}
                    <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-2">
                            <CalendarIcon className="text-lg" /> Created
                        </h4>
                        <p className="text-text-primary">
                            {habit.createdAt ? new Date(habit.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="border-t border-tertiary p-4 md:p-6 space-y-3">
                    {habit.isActive && (
                        <button
                            onClick={handleToggleCompletion}
                            disabled={isToggling}
                            className={`w-full py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                isCompleted
                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                    : 'bg-accent text-white hover:bg-accent/90'
                            }`}
                        >
                            {isToggling ? 'Updating...' : (isCompleted ? '✓ Completed Today' : 'Mark as Complete')}
                        </button>
                    )}
                    <button
                        onClick={handleEdit}
                        className="w-full py-3 bg-tertiary text-text-primary rounded-lg font-medium hover:bg-tertiary/80 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        <PencilIcon className="text-lg" /> Edit Habit
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-primary text-text-primary rounded-lg font-medium hover:bg-primary/80 transition-all duration-200"
                    >
                        Close
                    </button>
                </div>
                </div>
            </div>
        </>
    );
};

const HabitEditModal: React.FC<{
    habit: Habit;
    isOpen: boolean;
    onClose: () => void;
    onSave: (habit: Habit) => void;
}> = ({ habit, isOpen, onClose, onSave }) => {
    const [name, setName] = useState(habit.name);
    const [description, setDescription] = useState(habit.description || '');
    const [frequency, setFrequency] = useState(habit.frequency || 'daily');
    const [daysOfWeek, setDaysOfWeek] = useState(habit.daysOfWeek || []);
    const [xp, setXp] = useState(habit.xp || 10);
    const [isActive, setIsActive] = useState(habit.isActive ?? true);
    const [icon, setIcon] = useState(habit.icon || '🎯');
    const [color, setColor] = useState(habit.color || '#6366F1');
    const [category, setCategory] = useState(habit.category || 'personal');

    const habitIcons = ['🎯', '💪', '📚', '🏃', '🧘', '💧', '🥗', '😴', '✍️', '🎨', '🎵', '💼', '🧠', '❤️', '🌟', '⚡'];
    const habitColors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
    const categories = [
        { value: 'health', label: 'Health & Fitness', icon: '💪' },
        { value: 'productivity', label: 'Productivity', icon: '⚡' },
        { value: 'learning', label: 'Learning', icon: '📚' },
        { value: 'mindfulness', label: 'Mindfulness', icon: '🧘' },
        { value: 'creativity', label: 'Creativity', icon: '🎨' },
        { value: 'personal', label: 'Personal', icon: '🌟' },
    ];

    const handleSave = useCallback(async () => {
        if (!name.trim()) return;
        try {
            await onSave({
                ...habit,
                name,
                description,
                frequency: frequency as 'daily' | 'custom',
                daysOfWeek: frequency === 'custom' ? daysOfWeek : undefined,
                xp,
                isActive,
                icon,
                color,
                category,
                updatedAt: new Date(),
            });
            onClose();
        } catch (error) {
            console.error('Error saving habit:', error);
        }
    }, [name, description, frequency, daysOfWeek, xp, isActive, icon, color, category, habit, onSave, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">{habit.id ? 'Edit Habit' : 'Create Habit'}</h2>
                        <button onClick={onClose} className="p-2 hover:bg-tertiary rounded-lg">
                            <CloseIcon className="text-xl" />
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Habit Name *</label>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center text-3xl" style={{ backgroundColor: color + '20' }}>
                                {icon}
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="flex-1 bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder="Enter habit name"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Icon</label>
                        <div className="grid grid-cols-8 gap-2">
                            {habitIcons.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setIcon(emoji)}
                                    className={`p-2 text-2xl rounded-lg transition-all ${
                                        icon === emoji
                                            ? 'bg-accent/20 ring-2 ring-accent scale-110'
                                            : 'bg-tertiary hover:bg-tertiary/80'
                                    }`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Color</label>
                        <div className="grid grid-cols-8 gap-2">
                            {habitColors.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-10 h-10 rounded-lg transition-all ${
                                        color === c ? 'ring-2 ring-white scale-110' : ''
                                    }`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Category</label>
                        <div className="grid grid-cols-2 gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => setCategory(cat.value)}
                                    className={`p-3 rounded-lg text-left transition-all ${
                                        category === cat.value
                                            ? 'bg-accent text-white'
                                            : 'bg-tertiary text-text-primary hover:bg-tertiary/80'
                                    }`}
                                >
                                    <span className="text-xl mr-2">{cat.icon}</span>
                                    <span className="text-sm font-medium">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                            rows={3}
                            placeholder="Add details about your habit..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Frequency</label>
                            <select
                                value={frequency}
                                onChange={e => setFrequency(e.target.value)}
                                className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                            >
                                <option value="daily">Daily</option>
                                <option value="custom">Custom Days</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">XP Reward</label>
                            <input
                                type="number"
                                value={xp}
                                onChange={e => setXp(parseInt(e.target.value) || 10)}
                                className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                                min="1"
                            />
                        </div>
                    </div>

                    {frequency === 'custom' && (
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Days of Week</label>
                            <div className="grid grid-cols-7 gap-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            if (daysOfWeek.includes(idx)) {
                                                setDaysOfWeek(daysOfWeek.filter(d => d !== idx));
                                            } else {
                                                setDaysOfWeek([...daysOfWeek, idx]);
                                            }
                                        }}
                                        className={`py-2 rounded text-xs font-medium transition-all ${
                                            daysOfWeek.includes(idx)
                                                ? 'bg-accent text-white'
                                                : 'bg-tertiary text-text-primary hover:bg-tertiary/80'
                                        }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-primary rounded-lg">
                        <label className="text-sm font-medium text-text-primary">Active</label>
                        <button
                            onClick={() => setIsActive(!isActive)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                isActive
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-gray-500/20 text-gray-400'
                            }`}
                        >
                            {isActive ? 'Active' : 'Paused'}
                        </button>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-tertiary text-text-primary rounded-lg hover:bg-tertiary/80 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!name.trim()}
                            className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 font-medium disabled:opacity-50"
                        >
                            {habit.id ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HabitTracker;

