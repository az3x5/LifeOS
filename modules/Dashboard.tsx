import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { Module, Account, Transaction, Category, Habit, HabitLog, HealthLog, Note, HealthMetric, FastingLog, DailyReflection, SmartInsight, IslamicEvent, Reminder } from '../types';
import { calculateStreaks } from '../utils/habits';
import FinanceIcon from '../components/icons/FinanceIcon';
import HabitIcon from '../components/icons/HabitIcon';
import HealthIcon from '../components/icons/HealthIcon';
import IslamicIcon from '../components/icons/IslamicIcon';
import NotesIcon from '../components/icons/NotesIcon';
import SettingsIcon from '../components/icons/SettingsIcon';
import { GoogleGenAI, Type } from '@google/genai';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { gregorianToHijri, getMajorEventsForDate } from '../utils/islamic-calendar';
import ConfirmModal from '../components/modals/ConfirmModal';


const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#A855F7', '#06B6D4', '#EC4899', '#8B5CF6'];

type CalendarView = 'all' | 'habits' | 'fasting' | 'islamic' | 'reminders';

const InsightCard: React.FC<{
    insight: SmartInsight;
    onDismiss: (id: number) => void;
}> = ({ insight, onDismiss }) => (
    <div className="relative flex-shrink-0 w-64 h-48 p-4 rounded-2xl border border-tertiary bg-gradient-to-br from-secondary to-tertiary flex flex-col justify-between overflow-hidden">
        <div className="flex justify-between items-start">
            <span className="text-4xl">{insight.icon}</span>
            <button onClick={() => onDismiss(insight.id!)} title="Dismiss insight" className="text-text-muted hover:text-text-primary">&times;</button>
        </div>
        <div>
            <h4 className="font-bold text-text-primary">{insight.title}</h4>
            <p className="text-sm text-text-secondary">{insight.insight}</p>
        </div>
    </div>
);

const SmartInsights: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const insights = useLiveQuery(() => 
        db.smartInsights.where('status').equals('active').reverse().sortBy('generatedAt'), 
    []);

    const generateInsights = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Aggregate Data
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const transactions = await db.transactions.where('date').above(thirtyDaysAgo).toArray();
            const habits = await db.habits.toArray();
            const habitLogs = await db.habitLogs.toArray();
            const healthLogs = await db.healthLogs.where('date').above(thirtyDaysAgo).toArray();
            const notesCount = await db.notes.where('createdAt').above(thirtyDaysAgo).count();

            const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            const streaks = calculateStreaks(habits, habitLogs);
            const longestStreak = Math.max(0, ...Object.values(streaks).map(s => s.longestStreak));
            const sleepLogs = healthLogs.filter(l => l.metricId === 1); // Assuming sleep metric ID is 1
            const avgSleep = sleepLogs.length > 0 ? sleepLogs.reduce((sum, l) => sum + l.value, 0) / sleepLogs.length : 0;

            const summary = `
                - Finance: Last 30 days total expense: ${formatCurrency(totalExpense)}.
                - Habits: Longest streak across all habits is ${longestStreak} days.
                - Health: Average sleep over the last 30 days is ${avgSleep.toFixed(1)} hours.
                - Notes: Created ${notesCount} notes in the last 30 days.
            `;
            
            // 2. Call Gemini API
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `Based on the following user data summary, generate 3 short, actionable, and encouraging insights. Be concise.
            Data summary: ${summary}
            Provide the response in a JSON array format. Each object must have 'icon', 'title', and 'insight' keys.
            Available icons: 💡, 🌿, 🕌, 💰, 🧠. Choose the most relevant icon for each insight.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                icon: { type: Type.STRING },
                                title: { type: Type.STRING },
                                insight: { type: Type.STRING },
                            },
                            required: ['icon', 'title', 'insight']
                        }
                    }
                }
            });

            const jsonResponse = JSON.parse(response.text.replace(/```json|```/g, '').trim());

            // 3. Cache Insights
            await db.smartInsights.where('status').equals('active').modify({ status: 'dismissed' });
            const newInsights: Omit<SmartInsight, 'id'>[] = jsonResponse.map((item: any) => ({
                ...item,
                generatedAt: new Date(),
                status: 'active' as const
            }));
            await db.smartInsights.bulkAdd(newInsights);

        } catch (error) {
            console.error("Failed to generate insights:", error);
            // Optionally add a user-facing error message
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const shouldGenerate = async () => {
            const activeInsights = await db.smartInsights.where('status').equals('active').toArray();
            if (activeInsights.length === 0) {
                generateInsights();
            } else {
                const oneDayAgo = new Date();
                oneDayAgo.setDate(oneDayAgo.getDate() - 1);
                if (activeInsights[0].generatedAt < oneDayAgo) {
                    generateInsights();
                }
            }
        };
        shouldGenerate();
    }, [generateInsights]);

    const handleDismiss = async (id: number) => {
        await db.smartInsights.update(id, { status: 'dismissed' });
    };
    
    return (
        <div className="mb-8">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-text-primary">Smart Insights</h2>
                <button onClick={generateInsights} disabled={isLoading} className="flex items-center gap-2 bg-tertiary text-text-secondary text-sm font-semibold px-4 py-2 rounded-lg hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-wait">
                    <span className={`material-symbols-outlined ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
                    Regenerate
                </button>
            </div>
            <div className="flex overflow-x-auto space-x-4 pb-4">
                {isLoading && (!insights || insights.length === 0) && (
                    <div className="flex-shrink-0 w-64 h-48 rounded-2xl border border-tertiary bg-secondary flex items-center justify-center">
                        <p className="text-text-muted">Generating insights...</p>
                    </div>
                )}
                {insights?.map(insight => (
                    <InsightCard key={insight.id} insight={insight} onDismiss={handleDismiss} />
                ))}
                {insights?.length === 0 && !isLoading && (
                    <div className="flex-shrink-0 w-64 h-48 rounded-2xl border border-dashed border-tertiary bg-secondary flex items-center justify-center text-center p-4">
                        <p className="text-text-muted text-sm">No insights available. Generate new ones to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
}


const DashboardCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}> = ({ title, icon, onClick, children, className = '', style }) => (
    <div
        onClick={onClick}
        style={style}
        className={`bg-secondary p-6 rounded-xl border border-tertiary flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-accent shadow-lg hover:shadow-accent/20 cursor-pointer animate-fade-in-up ${className}`}
    >
        <div>
            <div className="flex items-center text-text-secondary mb-4">
                {icon}
                <h3 className="font-bold ml-2">{title}</h3>
            </div>
            {children}
        </div>
    </div>
);

// --- ANALYTICS COMPONENTS ---

// Utility function for calculating weekday data
const calculateWeekdayData = (habits: Habit[], logs: HabitLog[]): { name: string; rate: number }[] => {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = weekdays.map((name, i) => {
        const scheduledCount = logs.filter(log => { const day = new Date(log.date).getDay(); const habit = habits.find(h => h.id === log.habitId); return day === i && (habit?.frequency === 'daily' || habit?.daysOfWeek?.includes(i)); }).length;
        const completedCount = logs.filter(log => new Date(log.date).getDay() === i).length;
        return { name, rate: scheduledCount > 0 ? (completedCount / scheduledCount) * 100 : 0 };
    });
    return data;
};

// Utility function for calculating completion rate
const calculateCompletionRate = (habit: Habit, logs: HabitLog[]): number => {
    const habitLogs = logs.filter(l => l.habitId === habit.id);
    const firstLogDate = habitLogs.length > 0 ? new Date(habitLogs[0].date) : new Date();
    const sortedLogs = habitLogs.sort((a: HabitLog, b: HabitLog) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const startDate = new Date(sortedLogs[0]?.date || new Date());
    const totalDays = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
    if (totalDays <= 0) return 0;
    return (habitLogs.length / totalDays) * 100;
};

const AIInsightsWidget: React.FC<{ habits: Habit[], habitLogs: HabitLog[] }> = ({ habits, habitLogs }) => {
    const insight = useMemo(() => {
        if (habits.length === 0) return "Start by creating a new habit to see insights here!";
        const streaks = calculateStreaks(habits, habitLogs);
        const bestHabit = habits.reduce((best, current) => {
            const bestStreak = streaks[best.id!]?.longestStreak ?? 0;
            const currentStreak = streaks[current.id!]?.longestStreak ?? 0;
            return currentStreak > bestStreak ? current : best;
        }, habits[0]);
        const weekdayData = calculateWeekdayData(habits, habitLogs);
        const bestDay = weekdayData.reduce((best, current) => current.rate > best.rate ? current : best);
        return `Your most consistent habit is **"${bestHabit.name}"** with a longest streak of **${streaks[bestHabit.id!]?.longestStreak} days**. You're most successful on **${bestDay.name}s**, with a **${bestDay.rate.toFixed(0)}%** completion rate. Keep up the great work!`;
    }, [habits, habitLogs]);
    return (<div className="bg-secondary p-5 rounded-xl border border-tertiary"><h3 className="font-semibold text-sm text-accent">AI-Powered Insights</h3><p className="text-text-secondary mt-1" dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p></div>);
};

const WeekdayPerformanceWidget: React.FC<{ habits: Habit[], habitLogs: HabitLog[] }> = ({ habits, habitLogs }) => {
    const data = useMemo(() => calculateWeekdayData(habits, habitLogs), [habits, habitLogs]);
    return (
        <div className="bg-secondary p-6 rounded-xl border border-tertiary h-[400px]">
            <h2 className="text-xl font-semibold mb-4">Weekday Performance</h2>
            <ResponsiveContainer width="100%" height="90%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" /><XAxis dataKey="name" stroke="#94A3B8" fontSize={12} /><YAxis stroke="#94A3B8" fontSize={12} unit="%" /><Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155' }} /><Bar dataKey="rate" name="Completion Rate" fill="#3B82F6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
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

const CorrelationEngineWidget: React.FC<{ habits: Habit[], habitLogs: HabitLog[], healthMetrics?: HealthMetric[], healthLogs?: HealthLog[] }> = ({ habits, habitLogs, healthMetrics, healthLogs }) => {
    const [habitId, setHabitId] = useState<string>('');
    const [metricId, setMetricId] = useState<string>('');
    const correlation = useMemo(() => {
        if (!habitId || !metricId || !healthLogs) return { text: "Select a habit and a health metric to see their correlation.", value: 0 };
        const habitLogsForHabit = new Set(habitLogs.filter(l => l.habitId === Number(habitId)).map(l => l.date));
        const relevantHealthLogs = healthLogs.filter(l => l.metricId === Number(metricId));
        if (habitLogsForHabit.size === 0 || relevantHealthLogs.length === 0) return { text: "Not enough data to find a correlation.", value: 0 };
        const withHabitValues: number[] = [];
        const withoutHabitValues: number[] = [];
        relevantHealthLogs.forEach(log => {
            const dateStr = new Date(log.date).toISOString().split('T')[0];
            if (habitLogsForHabit.has(dateStr)) withHabitValues.push(log.value); else withoutHabitValues.push(log.value);
        });
        if (withHabitValues.length < 2 || withoutHabitValues.length < 2) return { text: "Not enough overlapping data.", value: 0 };
        const avgWith = withHabitValues.reduce((a, b) => a + b, 0) / withHabitValues.length;
        const avgWithout = withoutHabitValues.reduce((a, b) => a + b, 0) / withoutHabitValues.length;
        const diff = avgWith - avgWithout;
        const selectedHabit = habits.find(h => h.id === Number(habitId));
        const selectedMetric = healthMetrics?.find(m => m.id === Number(metricId));
        return { text: `On days you **'${selectedHabit?.name}'**, your average **'${selectedMetric?.name}'** was **${diff.toFixed(2)} ${selectedMetric?.unit} ${diff > 0 ? 'higher' : 'lower'}**.`, value: diff };
    }, [habitId, metricId, habits, habitLogs, healthMetrics, healthLogs]);
    return (
        <div className="bg-secondary p-6 rounded-xl border border-tertiary"><h2 className="text-xl font-semibold mb-4">Correlation Engine</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><select value={habitId} onChange={e => setHabitId(e.target.value)} className="bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent"><option value="">Select a Habit</option>{habits.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select><select value={metricId} onChange={e => setMetricId(e.target.value)} className="bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent"><option value="">Select a Health Metric</option>{healthMetrics?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div><div className="mt-4 p-4 bg-primary rounded-lg min-h-[60px]"><p className="text-text-secondary" dangerouslySetInnerHTML={{ __html: correlation.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p></div></div>
    );
};

const HealthAnalyticsWidget: React.FC<{ metrics?: HealthMetric[], logs?: HealthLog[] }> = ({ metrics, logs }) => {
    const [metricId, setMetricId] = useState<string>('');
    const [timeFilter, setTimeFilter] = useState('30d');

    const filteredLogs = useMemo(() => {
        if (!logs) return [];
        const now = new Date();
        const startDate = new Date();
        if (timeFilter === '7d') startDate.setDate(now.getDate() - 7);
        else if (timeFilter === '30d') startDate.setDate(now.getDate() - 30);
        else if (timeFilter === '90d') startDate.setDate(now.getDate() - 90);
        return logs.filter(log => new Date(log.date) >= startDate);
    }, [logs, timeFilter]);

    const chartData = useMemo(() => {
        const dataMap = new Map<string, any>();
        const metric = metrics?.find(m => m.id === Number(metricId));

        filteredLogs.forEach(log => {
            if (log.metricId === Number(metricId)) {
                const date = new Date(log.date).toISOString().split('T')[0];
                dataMap.set(date, { date, [metric!.name]: log.value });
            }
        });
        return Array.from(dataMap.values()).sort((a,b) => a.date.localeCompare(b.date));
    }, [filteredLogs, metricId, metrics]);

    return (
        <div className="bg-secondary p-6 rounded-xl border border-tertiary">
            <h3 className="text-xl font-semibold mb-4">Health Analytics & Trends</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end mb-6">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Metric</label>
                    <select value={metricId} onChange={e => setMetricId(e.target.value)} className="w-full bg-primary border border-tertiary rounded-lg py-3 px-3 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary appearance-none">
                        <option value="">Select Metric</option>
                        {metrics?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Time Period</label>
                    <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)} className="w-full bg-primary border border-tertiary rounded-lg py-3 px-3 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary appearance-none">
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                    </select>
                </div>
            </div>

            <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                        <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} />
                        <YAxis stroke="#94A3B8" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155' }} />
                        <Legend />
                        {metricId && <Line type="monotone" dataKey={metrics?.find(m=>m.id===Number(metricId))?.name} stroke="#3B82F6" strokeWidth={2} connectNulls />}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const FinanceAnalyticsWidget: React.FC<{ transactions?: Transaction[], categories?: Category[] }> = ({ transactions, categories }) => {
    const last30Days = useMemo(() => {
        const days = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    }, []);

    const cashFlowData = useMemo(() => {
        if (!transactions) return [];
        const dataMap = new Map<string, { date: string; Income: number; Expenses: number }>();
        last30Days.forEach(date => dataMap.set(date, { date, Income: 0, Expenses: 0 }));

        transactions.forEach(tx => {
            const date = new Date(tx.date).toISOString().split('T')[0];
            if (dataMap.has(date)) {
                const entry = dataMap.get(date)!;
                if (tx.type === 'income') entry.Income += tx.amount;
                else if (tx.type === 'expense') entry.Expenses += tx.amount;
            }
        });

        return Array.from(dataMap.values());
    }, [transactions, last30Days]);

    const categoryBreakdown = useMemo(() => {
        if (!transactions || !categories) return [];
        const expenseByCategory: Record<number, number> = {};
        transactions.filter(t => t.type === 'expense').forEach(t => {
            expenseByCategory[t.categoryId] = (expenseByCategory[t.categoryId] || 0) + t.amount;
        });

        return Object.entries(expenseByCategory).map(([catId, value]) => ({
            name: categories.find(c => c.id === Number(catId))?.name ?? 'Unknown',
            value
        })).sort((a, b) => b.value - a.value).slice(0, 8);
    }, [transactions, categories]);

    return (
        <>
            <div className="bg-secondary p-6 rounded-xl border border-tertiary h-[400px]">
                <h2 className="text-xl font-semibold mb-4">Cash Flow (Last 30 Days)</h2>
                <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={cashFlowData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                        <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value: number) => `$${value}`} />
                        <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155' }} cursor={{fill: 'rgba(255,255,255,0.1)'}}/>
                        <Legend />
                        <Line type="monotone" dataKey="Income" stroke="#10B981" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="Expenses" stroke="#EF4444" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-secondary p-6 rounded-xl border border-tertiary h-[400px]">
                <h2 className="text-xl font-semibold mb-4">Expense Breakdown</h2>
                <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                        <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" paddingAngle={5} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {categoryBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155' }} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </>
    );
};

// --- CALENDAR COMPONENTS ---

const VIEWS = [
    { id: 'all' as CalendarView, label: 'All Events', icon: '📅' },
    { id: 'habits' as CalendarView, label: 'Habits', icon: '✓' },
    { id: 'fasting' as CalendarView, label: 'Fasting', icon: '🌙' },
    { id: 'islamic' as CalendarView, label: 'Islamic Events', icon: '🕌' },
    { id: 'reminders' as CalendarView, label: 'Reminders', icon: '🔔' },
];

const CalendarHeader: React.FC<{ currentDate: Date; changeMonth: (offset: number) => void }> = ({ currentDate, changeMonth }) => {
    return (
        <div className="flex justify-between items-center mb-4">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-tertiary text-text-primary">
                <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <h2 className="text-xl font-bold text-text-primary">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-tertiary text-text-primary">
                <span className="material-symbols-outlined">chevron_right</span>
            </button>
        </div>
    );
};

const UnifiedCalendarGrid: React.FC<{
    currentDate: Date;
    activeView: CalendarView;
    habits?: Habit[];
    habitLogs?: HabitLog[];
    fastingLogs?: FastingLog[];
    islamicEvents?: IslamicEvent[];
    reminders?: Reminder[];
    onDayClick: (date: string) => void;
}> = ({ currentDate, activeView, habits, habitLogs, fastingLogs, islamicEvents, reminders, onDayClick }) => {
    const days = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const firstDayOfWeek = firstDayOfMonth.getDay();
        const todayStr = new Date().toISOString().split('T')[0];

        const daysArray = [];

        // Empty cells before first day
        for (let i = 0; i < firstDayOfWeek; i++) {
            daysArray.push(<div key={`empty-${i}`} className="border-r border-b border-tertiary h-24"></div>);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;

            // Collect events for this day
            const dayHabitLogs = habitLogs?.filter(log => log.date === dateStr) || [];
            const dayFastingLog = fastingLogs?.find(log => log.date === dateStr);
            const dayIslamicEvent = islamicEvents?.find(event => event.gregorianDate === dateStr);
            const majorEvents = getMajorEventsForDate(date);
            const dayReminders = reminders?.filter(r => {
                const reminderDate = new Date(r.dueDate).toISOString().split('T')[0];
                return reminderDate === dateStr && r.status !== 'completed';
            }) || [];

            const showHabits = activeView === 'all' || activeView === 'habits';
            const showFasting = activeView === 'all' || activeView === 'fasting';
            const showIslamic = activeView === 'all' || activeView === 'islamic';
            const showReminders = activeView === 'all' || activeView === 'reminders';

            daysArray.push(
                <button
                    key={day}
                    onClick={() => onDayClick(dateStr)}
                    className={`border-r border-b border-tertiary h-24 p-2 text-left hover:bg-tertiary transition-colors ${
                        isToday ? 'bg-accent/10' : ''
                    }`}
                >
                    <div className="flex flex-col h-full">
                        <span className={`text-sm font-semibold mb-1 ${isToday ? 'text-accent' : 'text-text-primary'}`}>
                            {day}
                        </span>
                        <div className="flex-1 overflow-hidden space-y-0.5">
                            {showHabits && dayHabitLogs.length > 0 && (
                                <div className="text-xs bg-green-500/30 text-green-200 px-1 rounded truncate">
                                    ✓ {dayHabitLogs.length} habit{dayHabitLogs.length > 1 ? 's' : ''}
                                </div>
                            )}
                            {showFasting && dayFastingLog && (
                                <div className={`text-xs px-1 rounded truncate ${
                                    dayFastingLog.status === 'completed' ? 'bg-blue-500/30 text-blue-200' :
                                    dayFastingLog.status === 'missed' ? 'bg-red-500/30 text-red-200' :
                                    'bg-yellow-500/30 text-yellow-200'
                                }`}>
                                    🌙 {dayFastingLog.type}
                                </div>
                            )}
                            {showIslamic && majorEvents.length > 0 && (
                                <div className="text-xs bg-purple-500/30 text-purple-200 px-1 rounded truncate">
                                    🕌 {majorEvents[0].name}
                                </div>
                            )}
                            {showIslamic && dayIslamicEvent && (
                                <div className="text-xs bg-blue-500/30 text-blue-200 px-1 rounded truncate">
                                    📝 Note
                                </div>
                            )}
                            {showReminders && dayReminders.length > 0 && (
                                <div className={`text-xs px-1 rounded truncate ${
                                    dayReminders.some(r => r.status === 'overdue') ? 'bg-red-500/30 text-red-200' :
                                    dayReminders.some(r => r.priority === 'high') ? 'bg-orange-500/30 text-orange-200' :
                                    'bg-cyan-500/30 text-cyan-200'
                                }`}>
                                    🔔 {dayReminders.length} reminder{dayReminders.length > 1 ? 's' : ''}
                                </div>
                            )}
                        </div>
                    </div>
                </button>
            );
        }

        return daysArray;
    }, [currentDate, activeView, habits, habitLogs, fastingLogs, islamicEvents, reminders, onDayClick]);

    return (
        <div className="border-t border-l border-tertiary">
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-text-secondary">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-2 border-r border-b border-tertiary">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {days}
            </div>
        </div>
    );
};

const DayDetailModal: React.FC<{
    date: string;
    activeView: CalendarView;
    habits?: Habit[];
    habitLogs?: HabitLog[];
    fastingLogs?: FastingLog[];
    islamicEvents?: IslamicEvent[];
    reminders?: Reminder[];
    onClose: () => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({ date, activeView, habits, habitLogs, fastingLogs, islamicEvents, reminders, onClose, setConfirmModal }) => {
    const dateObj = new Date(date + 'T00:00:00');
    const dayHabitLogs = habitLogs?.filter(log => log.date === date) || [];
    const dayFastingLog = fastingLogs?.find(log => log.date === date);
    const dayIslamicEvent = islamicEvents?.find(event => event.gregorianDate === date);
    const majorEvents = getMajorEventsForDate(dateObj);
    const hijriDate = gregorianToHijri(dateObj);
    const dayReminders = reminders?.filter(r => {
        const reminderDate = new Date(r.dueDate).toISOString().split('T')[0];
        return reminderDate === date;
    }) || [];

    const showHabits = activeView === 'all' || activeView === 'habits';
    const showFasting = activeView === 'all' || activeView === 'fasting';
    const showIslamic = activeView === 'all' || activeView === 'islamic';
    const showReminders = activeView === 'all' || activeView === 'reminders';

    const handleDeleteFastingLog = () => {
        if (dayFastingLog) {
            setConfirmModal({
                isOpen: true,
                title: 'Delete Fasting Log',
                message: 'Are you sure you want to delete this fasting log?',
                icon: '🌙',
                onConfirm: async () => {
                    await db.fastingLogs.delete(dayFastingLog.id!);
                    setConfirmModal(null);
                    onClose();
                }
            });
        }
    };

    const handleDeleteIslamicEvent = () => {
        if (dayIslamicEvent) {
            setConfirmModal({
                isOpen: true,
                title: 'Delete Note',
                message: 'Are you sure you want to delete this note?',
                icon: '📅',
                onConfirm: async () => {
                    await db.islamicEvents.delete(dayIslamicEvent.gregorianDate);
                    setConfirmModal(null);
                    onClose();
                }
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary border border-tertiary rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary">
                            {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </h2>
                        {showIslamic && (
                            <p className="text-sm text-text-secondary mt-1">
                                {hijriDate.day} {hijriDate.monthName} {hijriDate.year} AH
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary text-2xl">
                        &times;
                    </button>
                </div>

                <div className="space-y-6">
                    {showHabits && dayHabitLogs.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-accent mb-2">✓ Completed Habits</h3>
                            <div className="space-y-2">
                                {dayHabitLogs.map(log => {
                                    const habit = habits?.find(h => h.id === log.habitId);
                                    return (
                                        <div key={log.id} className="bg-primary p-3 rounded-lg border border-tertiary">
                                            <p className="font-medium text-text-primary">{habit?.name || 'Unknown Habit'}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {showFasting && dayFastingLog && (
                        <div>
                            <h3 className="text-lg font-semibold text-accent mb-2">🌙 Fasting Log</h3>
                            <div className="bg-primary p-4 rounded-lg border border-tertiary">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-medium text-text-primary capitalize">{dayFastingLog.type}</p>
                                        <p className={`text-sm mt-1 ${
                                            dayFastingLog.status === 'completed' ? 'text-green-400' :
                                            dayFastingLog.status === 'missed' ? 'text-red-400' :
                                            'text-yellow-400'
                                        }`}>
                                            Status: {dayFastingLog.status}
                                        </p>
                                        {dayFastingLog.notes && (
                                            <p className="text-sm text-text-secondary mt-2">{dayFastingLog.notes}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleDeleteFastingLog}
                                        className="text-red-400 hover:text-red-300 text-sm"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {showIslamic && majorEvents.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-accent mb-2">🕌 Islamic Events</h3>
                            <div className="space-y-2">
                                {majorEvents.map((event, idx) => (
                                    <div key={idx} className="bg-primary p-3 rounded-lg border border-tertiary">
                                        <p className="font-medium text-text-primary">{event.name}</p>
                                        <p className="text-sm text-text-secondary">{event.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {showIslamic && dayIslamicEvent && (
                        <div>
                            <h3 className="text-lg font-semibold text-accent mb-2">📝 Personal Note</h3>
                            <div className="bg-primary p-4 rounded-lg border border-tertiary">
                                <div className="flex justify-between items-start">
                                    <p className="text-text-primary">{dayIslamicEvent.notes}</p>
                                    <button
                                        onClick={handleDeleteIslamicEvent}
                                        className="text-red-400 hover:text-red-300 text-sm ml-4"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {showReminders && dayReminders.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-accent mb-2">🔔 Reminders</h3>
                            <div className="space-y-2">
                                {dayReminders.map(reminder => (
                                    <div key={reminder.id} className={`bg-primary p-3 rounded-lg border ${
                                        reminder.status === 'overdue' ? 'border-red-500/50' :
                                        reminder.status === 'completed' ? 'border-green-500/50' :
                                        'border-tertiary'
                                    }`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className={`font-medium ${
                                                    reminder.status === 'completed' ? 'line-through text-text-muted' : 'text-text-primary'
                                                }`}>
                                                    {reminder.title}
                                                </p>
                                                {reminder.description && (
                                                    <p className="text-sm text-text-secondary mt-1">{reminder.description}</p>
                                                )}
                                                <div className="flex gap-2 mt-2">
                                                    <span className={`text-xs px-2 py-1 rounded ${
                                                        reminder.priority === 'high' ? 'bg-red-500/30 text-red-200' :
                                                        reminder.priority === 'medium' ? 'bg-yellow-500/30 text-yellow-200' :
                                                        'bg-blue-500/30 text-blue-200'
                                                    }`}>
                                                        {reminder.priority}
                                                    </span>
                                                    <span className="text-xs px-2 py-1 rounded bg-tertiary text-text-secondary">
                                                        {reminder.category}
                                                    </span>
                                                    {reminder.dueTime && (
                                                        <span className="text-xs px-2 py-1 rounded bg-tertiary text-text-secondary">
                                                            {reminder.dueTime}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!dayHabitLogs.length && !dayFastingLog && !majorEvents.length && !dayIslamicEvent && !dayReminders.length && (
                        <p className="text-center text-text-muted py-8">No events on this day</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const CalendarTab: React.FC<{
    habits?: Habit[];
    habitLogs?: HabitLog[];
    fastingLogs?: FastingLog[];
    islamicEvents?: IslamicEvent[];
    reminders?: Reminder[];
}> = ({ habits, habitLogs, fastingLogs, islamicEvents, reminders }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeView, setActiveView] = useState<CalendarView>('all');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null>(null);

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
                <h2 className="text-2xl font-bold">Unified Calendar</h2>
                <div className="flex gap-2 flex-wrap">
                    {VIEWS.map(view => (
                        <button
                            key={view.id}
                            onClick={() => setActiveView(view.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeView === view.id
                                    ? 'bg-accent text-white'
                                    : 'bg-secondary text-text-secondary hover:bg-tertiary'
                            }`}
                        >
                            <span className="mr-2">{view.icon}</span>
                            {view.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                <CalendarHeader currentDate={currentDate} changeMonth={changeMonth} />
                <UnifiedCalendarGrid
                    currentDate={currentDate}
                    activeView={activeView}
                    habits={habits}
                    habitLogs={habitLogs}
                    fastingLogs={fastingLogs}
                    islamicEvents={islamicEvents}
                    reminders={reminders}
                    onDayClick={setSelectedDate}
                />
            </div>

            {selectedDate && (
                <DayDetailModal
                    date={selectedDate}
                    activeView={activeView}
                    habits={habits}
                    habitLogs={habitLogs}
                    fastingLogs={fastingLogs}
                    islamicEvents={islamicEvents}
                    reminders={reminders}
                    onClose={() => setSelectedDate(null)}
                    setConfirmModal={setConfirmModal}
                />
            )}

            {confirmModal && (
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    icon={confirmModal.icon}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}
        </div>
    );
};

const AnalyticsTab: React.FC<{
    habits?: Habit[];
    habitLogs?: HabitLog[];
    healthMetrics?: HealthMetric[];
    healthLogs?: HealthLog[];
    transactions?: Transaction[];
    categories?: Category[];
}> = ({ habits, habitLogs, healthMetrics, healthLogs, transactions, categories }) => {
    if (!habits || !habitLogs) return <div className="text-center p-8 text-text-muted">Loading analytics data...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
                <h2 className="text-2xl font-bold">Comprehensive Analytics</h2>
                <div className="flex items-center space-x-2">
                    <button className="bg-tertiary text-sm py-2 px-3 rounded-lg hover:bg-opacity-80 disabled:opacity-50" disabled>Export CSV</button>
                    <button className="bg-tertiary text-sm py-2 px-3 rounded-lg hover:bg-opacity-80 disabled:opacity-50" disabled>Export PDF</button>
                </div>
            </div>

            <div className="space-y-8">
                <div>
                    <h3 className="text-xl font-semibold mb-4 text-accent">📊 Habit Analytics</h3>
                    <AIInsightsWidget habits={habits} habitLogs={habitLogs} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                        <WeekdayPerformanceWidget habits={habits} habitLogs={habitLogs} />
                        <HabitPerformanceWidget habits={habits} habitLogs={habitLogs} />
                    </div>
                    <div className="mt-6">
                        <CorrelationEngineWidget habits={habits} habitLogs={habitLogs} healthMetrics={healthMetrics} healthLogs={healthLogs} />
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-semibold mb-4 text-accent">💪 Health Analytics</h3>
                    <HealthAnalyticsWidget metrics={healthMetrics} logs={healthLogs} />
                </div>

                <div>
                    <h3 className="text-xl font-semibold mb-4 text-accent">💰 Finance Analytics</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <FinanceAnalyticsWidget transactions={transactions} categories={categories} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const Dashboard: React.FC<{ setActiveModule: (module: Module) => void }> = ({ setActiveModule }) => {

    // --- Data Hooks ---
    const accounts = useLiveQuery(() => db.accounts.toArray());
    const transactions = useLiveQuery(() => db.transactions.toArray());
    const categories = useLiveQuery(() => db.categories.toArray());
    const habits = useLiveQuery(() => db.habits.toArray());
    const habitLogs = useLiveQuery(() => db.habitLogs.toArray());
    const healthMetrics = useLiveQuery(() => db.healthMetrics.toArray());
    const healthLogs = useLiveQuery(() => db.healthLogs.toArray());
    // FIX: Corrected Dexie query. `orderBy` is not a method on a Collection returned by `where`.
    // Instead, we fetch the active notes and perform a client-side sort.
    const notes = useLiveQuery(async () => {
        const activeNotes = await db.notes.where({ status: 'active' }).toArray();
        return activeNotes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 3);
    }, []);
    const fastingLogs = useLiveQuery(() => db.fastingLogs.toArray());
    const islamicEvents = useLiveQuery(() => db.islamicEvents.toArray());
    const reminders = useLiveQuery(() => db.reminders.toArray());
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const dailyReflection = useLiveQuery(() => db.dailyReflections.get(todayStr), [todayStr]);

    // --- Memoized Data Processing ---

    const financeData = useMemo(() => {
        if (!accounts || !transactions || !categories) return { balance: 0, income: 0, expense: 0, topCategory: 'N/A' };
        
        const balance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyTx = transactions.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const income = monthlyTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = monthlyTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        const expenseByCategory: Record<number, number> = {};
        monthlyTx.filter(t => t.type === 'expense').forEach(t => {
            expenseByCategory[t.categoryId] = (expenseByCategory[t.categoryId] || 0) + t.amount;
        });
        
        const topCatId = Object.keys(expenseByCategory).length > 0
            ? Number(Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0][0])
            : null;
        
        const topCategory = topCatId ? categories.find(c => c.id === topCatId)?.name ?? 'N/A' : 'N/A';
        
        return { balance, income, expense, topCategory };
    }, [accounts, transactions, categories]);
    
    const habitData = useMemo(() => {
        if (!habits || !habitLogs) return { completion: 0, activeStreak: 0 };
        const todayDay = new Date().getDay();
        const todaysHabits = habits.filter(h => h.frequency === 'daily' || h.daysOfWeek?.includes(todayDay));
        const completedToday = habitLogs.filter(l => l.date === todayStr).map(l => l.habitId);
        const completion = todaysHabits.length > 0 ? (completedToday.length / todaysHabits.length) * 100 : 0;

        const streaks = calculateStreaks(habits, habitLogs);
        const activeStreak = Math.max(0, ...Object.values(streaks).map(s => s.currentStreak));

        return { completion, activeStreak };
    }, [habits, habitLogs, todayStr]);

    const healthData = useMemo(() => {
        if (!healthMetrics || !healthLogs) return {};
        const getLatestValue = (name: string) => {
            const metric = healthMetrics.find(m => m.name.toLowerCase() === name.toLowerCase());
            if (!metric) return null;
            const log = healthLogs.filter(l => l.metricId === metric.id).sort((a,b) => b.date.getTime() - a.date.getTime())[0];
            return log ? { value: log.value, unit: metric.unit } : null;
        }
        return {
            steps: getLatestValue('steps'),
            calories: getLatestValue('calories'),
            sleep: getLatestValue('sleep'),
            mood: getLatestValue('mood'),
        }
    }, [healthMetrics, healthLogs]);

    const islamicData = useMemo(() => {
        const fastLog = fastingLogs?.find(f => f.date === todayStr);
        return {
            fastingStatus: fastLog ? `Today's Fast: ${fastLog.status}` : 'No Fast Logged',
            dailyAyah: dailyReflection?.content.ayah
        }
    }, [fastingLogs, dailyReflection, todayStr]);


    return (
        <div className="animate-fade-in">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-accent to-purple bg-clip-text text-transparent mb-8">Dashboard</h1>

            {/* Smart Insights Section */}
            <SmartInsights />

            {/* Overview Cards Section */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-text-primary mb-4">Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                
                <DashboardCard title="Finance" icon={<FinanceIcon />} onClick={() => setActiveModule(Module.FINANCE)} style={{ animationDelay: '100ms' }}>
                    <p className="text-3xl font-bold">{formatCurrency(financeData.balance)}</p>
                    <div className="text-sm mt-2">
                        <div className="w-full bg-tertiary rounded-full h-2 my-2">
                             <div className="bg-green-500 h-2 rounded-l-full" style={{ width: `${(financeData.income / (financeData.income + financeData.expense)) * 100}%` }}></div>
                             <div className="bg-red-500 h-2 rounded-r-full" style={{ width: `${(financeData.expense / (financeData.income + financeData.expense)) * 100}%` }}></div>
                        </div>
                        <div className="flex justify-between text-text-secondary"><span>Income: {formatCurrency(financeData.income)}</span><span>Expense: {formatCurrency(financeData.expense)}</span></div>
                        <p className="mt-2 text-text-muted">Top category: <span className="font-semibold text-text-primary">{financeData.topCategory}</span></p>
                    </div>
                </DashboardCard>

                <DashboardCard title="Habits" icon={<HabitIcon />} onClick={() => setActiveModule(Module.HABITS)} style={{ animationDelay: '200ms' }}>
                    <p className="text-3xl font-bold">{habitData.completion.toFixed(0)}% <span className="text-lg font-medium text-text-secondary">Today</span></p>
                     <div className="w-full bg-tertiary rounded-full h-2.5 my-3">
                        <div className="bg-accent h-2.5 rounded-full" style={{ width: `${habitData.completion}%` }}></div>
                    </div>
                    <div className="flex items-center text-orange-400">
                        <span className="material-symbols-outlined">local_fire_department</span>
                        <span className="ml-1 font-semibold">{habitData.activeStreak} Day Streak</span>
                    </div>
                </DashboardCard>
                
                <DashboardCard title="Health" icon={<HealthIcon />} onClick={() => setActiveModule(Module.HEALTH)} style={{ animationDelay: '300ms' }}>
                     <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                        <div className="font-semibold"><span className="material-symbols-outlined text-base mr-1 text-accent align-bottom">footprint</span> Steps<p className="text-lg text-text-primary">{healthData.steps?.value ?? 'N/A'}</p></div>
                        <div className="font-semibold"><span className="material-symbols-outlined text-base mr-1 text-accent align-bottom">local_fire_department</span> Calories<p className="text-lg text-text-primary">{healthData.calories?.value ?? 'N/A'}</p></div>
                        <div className="font-semibold"><span className="material-symbols-outlined text-base mr-1 text-accent align-bottom">bed</span> Sleep<p className="text-lg text-text-primary">{healthData.sleep?.value ?? 'N/A'} {healthData.sleep?.unit}</p></div>
                        <div className="font-semibold"><span className="material-symbols-outlined text-base mr-1 text-accent align-bottom">sentiment_satisfied</span> Mood<p className="text-lg text-text-primary">{healthData.mood ? `${'⭐'.repeat(healthData.mood.value)}${'⚫'.repeat(5 - healthData.mood.value)}` : 'N/A'}</p></div>
                    </div>
                </DashboardCard>

                <DashboardCard title="Islamic" icon={<IslamicIcon />} onClick={() => setActiveModule(Module.ISLAMIC)} className="xl:col-span-2" style={{ animationDelay: '400ms' }}>
                    <p className="text-lg italic text-text-primary">"{islamicData.dailyAyah ?? '...'}"</p>
                    <p className="text-right text-sm text-text-muted mt-2">- Daily Reflection</p>
                    <div className="border-t border-tertiary my-3"></div>
                    <p className="text-text-secondary">{islamicData.fastingStatus}</p>
                </DashboardCard>

                <DashboardCard title="Notes" icon={<NotesIcon />} onClick={() => setActiveModule(Module.NOTES)} style={{ animationDelay: '500ms' }}>
                     <div className="space-y-2">
                        {notes?.map(note => (
                            <div key={note.id} className="p-2 bg-primary rounded-md">
                                <p className="font-semibold text-text-primary truncate">{note.title}</p>
                            </div>
                        ))}
                        {(!notes || notes.length === 0) && <p className="text-sm text-text-muted">No recent notes.</p>}
                     </div>
                </DashboardCard>
                
                <DashboardCard title="Settings" icon={<SettingsIcon />} onClick={() => setActiveModule(Module.SETTINGS)} style={{ animationDelay: '600ms' }}>
                     <p className="text-text-secondary text-sm">Customize your LifeOS experience, manage data, and set preferences.</p>
                </DashboardCard>
                </div>
            </div>

            {/* Calendar Section */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-text-primary mb-4">Calendar</h2>
                <CalendarTab
                    habits={habits}
                    habitLogs={habitLogs}
                    fastingLogs={fastingLogs}
                    islamicEvents={islamicEvents}
                    reminders={reminders}
                />
            </div>

            {/* Analytics Section */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-text-primary mb-4">Analytics</h2>
                <AnalyticsTab
                    habits={habits}
                    habitLogs={habitLogs}
                    healthMetrics={healthMetrics}
                    healthLogs={healthLogs}
                    transactions={transactions}
                    categories={categories}
                />
            </div>
        </div>
    );
};

export default Dashboard;