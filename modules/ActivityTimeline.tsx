
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { Transaction, HabitLog, HealthLog, Note, FastingLog, Module, Habit, HealthMetric } from '../types';
import FinanceIcon from '../components/icons/FinanceIcon';
import HabitIcon from '../components/icons/HabitIcon';
import HealthIcon from '../components/icons/HealthIcon';
import IslamicIcon from '../components/icons/IslamicIcon';
import NotesIcon from '../components/icons/NotesIcon';

type ActivityType = 'transaction' | 'habit' | 'health' | 'note' | 'islamic';

interface BaseActivity {
    id: string;
    type: ActivityType;
    timestamp: Date;
    data: any;
}

const BATCH_SIZE = 20;

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const ActivityTimeline: React.FC = () => {
    const [filterModule, setFilterModule] = useState<ActivityType | 'all'>('all');
    const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
    const loaderRef = useRef(null);

    // --- Data Fetching ---
    const transactions = useSupabaseQuery<Transaction>('transactions');
    const habitLogs = useSupabaseQuery<HabitLog>('habit_logs');
    const healthLogs = useSupabaseQuery<HealthLog>('health_logs');
    const notes = useSupabaseQuery<Note>('notes');
    const fastingLogs = useSupabaseQuery<FastingLog>('fasting_logs');
    const habits = useSupabaseQuery<Habit>('habits');
    const healthMetrics = useSupabaseQuery<HealthMetric>('health_metrics');

    const habitMap = useMemo(() => new Map(habits?.map(h => [h.id, h.name])), [habits]);
    const metricMap = useMemo(() => new Map(healthMetrics?.map(m => [m.id, { name: m.name, unit: m.unit }])), [healthMetrics]);

    // --- Data Merging and Filtering ---
    const allActivities = useMemo<BaseActivity[]>(() => {
        const activities: BaseActivity[] = [];

        transactions?.forEach(t => activities.push({ id: `t-${t.id}`, type: 'transaction', timestamp: t.date, data: t }));
        habitLogs?.forEach(l => {
            const date = new Date(l.date);
            date.setHours(12, 0, 0, 0); // Normalize time
            activities.push({ id: `h-${l.id}`, type: 'habit', timestamp: date, data: { ...l, name: habitMap.get(l.habitId) || 'Unknown Habit' } });
        });
        // FIX: Provided a default object for health metric data to prevent a crash when spreading a potentially undefined value from `metricMap`.
        healthLogs?.forEach(l => {
            const timestamp = typeof l.date === 'string' ? new Date(l.date) : l.date;
            activities.push({ id: `m-${l.id}`, type: 'health', timestamp, data: { ...l, ...(metricMap.get(l.metricId) || { name: 'Unknown Metric', unit: '' }) } });
        });
        notes?.forEach(n => {
            const timestamp = n.createdAt ? (typeof n.createdAt === 'string' ? new Date(n.createdAt) : n.createdAt) : new Date();
            activities.push({ id: `n-${n.id}`, type: 'note', timestamp, data: n });
        });
        fastingLogs?.forEach(f => {
            const date = new Date(f.date);
            date.setHours(12,0,0,0);
            activities.push({ id: `f-${f.id}`, type: 'islamic', timestamp: date, data: f });
        });

        return activities.sort((a, b) => {
            const aTime = a.timestamp ? (typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime()) : 0;
            const bTime = b.timestamp ? (typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime()) : 0;
            return bTime - aTime;
        });
    }, [transactions, habitLogs, healthLogs, notes, fastingLogs, habitMap, metricMap]);

    const filteredActivities = useMemo(() => {
        const selectedDate = new Date(filterDate);
        const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
        
        return allActivities.filter(activity => {
            const activityDate = new Date(activity.timestamp);
            const isSameDay = activityDate >= startOfDay && activityDate <= endOfDay;
            const moduleMatch = filterModule === 'all' || activity.type === filterModule;
            return isSameDay && moduleMatch;
        });
    }, [allActivities, filterDate, filterModule]);
    
    // --- Infinite Scroll ---
     const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
        const target = entries[0];
        if (target.isIntersecting) {
            setVisibleCount(prev => prev + BATCH_SIZE);
        }
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(handleObserver, { root: null, rootMargin: "20px", threshold: 1.0 });
        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }
        return () => {
            if (loaderRef.current) {
                observer.unobserve(loaderRef.current);
            }
        };
    }, [handleObserver]);
    
    // Reset scroll when filters change
    useEffect(() => {
        setVisibleCount(BATCH_SIZE);
    }, [filterDate, filterModule]);

    const visibleActivities = useMemo(() => filteredActivities.slice(0, visibleCount), [filteredActivities, visibleCount]);

    // --- Insights Panel Data ---
    const dailyInsights = useMemo(() => {
        const todayActivities = filteredActivities;
        const habitsCompleted = todayActivities.filter(a => a.type === 'habit').length;
        const expenses = todayActivities
            .filter(a => a.type === 'transaction' && a.data.type === 'expense')
            .reduce((sum, a) => sum + a.data.amount, 0);
        const notesCreated = todayActivities.filter(a => a.type === 'note').length;
        const healthLogs = todayActivities.filter(a => a.type === 'health').length;
        return { habitsCompleted, expenses, notesCreated, healthLogs };
    }, [filteredActivities]);


    return (
        <div className="animate-fade-in space-y-8">
            <h1 className="text-4xl font-bold text-text-primary">Activity Timeline</h1>
            <div className="flex flex-col md:flex-row gap-4">
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-secondary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent" />
                <select value={filterModule} onChange={e => setFilterModule(e.target.value as ActivityType | 'all')} className="bg-secondary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent">
                    <option value="all">All Modules</option>
                    <option value="transaction">Finance</option>
                    <option value="habit">Habits</option>
                    <option value="health">Health</option>
                    <option value="islamic">Islamic</option>
                    <option value="note">Notes</option>
                </select>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 relative">
                    <div className="absolute left-4 md:left-5 top-0 h-full w-0.5 bg-tertiary -z-10"></div>
                     {visibleActivities.map(activity => (
                        <TimelineItem key={activity.id} activity={activity} />
                     ))}
                     <div ref={loaderRef} className="h-10">
                        {visibleCount < filteredActivities.length && <p className="text-center text-text-muted">Loading more...</p>}
                     </div>
                     {filteredActivities.length === 0 && (
                        <div className="text-center bg-secondary p-8 rounded-lg border border-tertiary">
                            <p className="text-text-muted">No activities found for this day.</p>
                        </div>
                     )}
                </div>

                <aside className="hidden lg:block">
                     <div className="sticky top-10 bg-secondary p-6 rounded-xl border border-tertiary">
                        <h2 className="text-2xl font-bold mb-4">Daily Insights</h2>
                        <div className="space-y-4">
                            <InsightCard title="Habits Completed" value={dailyInsights.habitsCompleted} />
                            <InsightCard title="Total Expenses" value={formatCurrency(dailyInsights.expenses)} />
                            <InsightCard title="Health Items Logged" value={dailyInsights.healthLogs} />
                            <InsightCard title="Notes Created" value={dailyInsights.notesCreated} />
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};


const TimelineItem: React.FC<{ activity: BaseActivity }> = ({ activity }) => {
    const getIcon = () => {
        switch (activity.type) {
            case 'transaction': return <FinanceIcon className="text-accent"/>;
            case 'habit': return <HabitIcon className="text-accent"/>;
            case 'health': return <HealthIcon className="text-accent"/>;
            case 'note': return <NotesIcon className="text-accent"/>;
            case 'islamic': return <IslamicIcon className="text-accent"/>;
            default: return null;
        }
    };
    
    const renderContent = () => {
        switch (activity.type) {
            case 'transaction':
                const t = activity.data as Transaction;
                const isExpense = t.type === 'expense';
                return (
                    <p>
                        {isExpense ? 'Added expense ' : 'Received income '}
                        <span className="font-semibold text-text-primary">"{t.description}"</span> for 
                        <span className={`font-bold ${isExpense ? 'text-red-400' : 'text-green-400'}`}> {formatCurrency(t.amount)}</span>.
                    </p>
                );
            case 'habit':
                return <p>Completed habit <span className="font-semibold text-text-primary">"{activity.data.name}"</span>.</p>;
            case 'health':
                 return <p>Logged <span className="font-semibold text-text-primary">{activity.data.value} {activity.data.unit}</span> for <span className="font-semibold text-text-primary">{activity.data.name}</span>.</p>;
            case 'note':
                return <p>Created note <span className="font-semibold text-text-primary">"{activity.data.title}"</span>.</p>;
            case 'islamic':
                return <p><span className="capitalize">{activity.data.status}</span> <span className="font-semibold text-text-primary">{activity.data.type} fast</span>.</p>;
            default:
                return <p>Unknown activity type.</p>;
        }
    }

    return (
        <div className="flex items-start mb-6">
            <div className="flex-shrink-0 w-10 h-10 md:w-11 md:h-11 bg-secondary rounded-full border-2 border-tertiary flex items-center justify-center mr-4 z-10">
                {getIcon()}
            </div>
            <div className="bg-secondary p-4 rounded-lg border border-tertiary flex-1">
                <div className="text-sm text-text-secondary">{renderContent()}</div>
                <p className="text-xs text-text-muted mt-1">{new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
        </div>
    );
};

const InsightCard: React.FC<{title: string, value: string | number}> = ({ title, value }) => (
    <div className="bg-primary p-4 rounded-lg">
        <p className="text-sm text-text-secondary">{title}</p>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
    </div>
);


export default ActivityTimeline;