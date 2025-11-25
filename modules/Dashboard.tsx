import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { Module, Account, Transaction, Category, Habit, HabitLog, HealthLog, Note, HealthMetric, FastingLog, DailyReflection, SmartInsight, IslamicEvent, Reminder } from '../types';
import { smartInsightsService, transactionsService, habitsService, habitLogsService, healthLogsService, notesService, fastingLogsService, islamicEventsService, remindersService, healthMetricsService } from '../services/dataService';
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
    <div className="relative flex-shrink-0 w-56 h-32 p-3 rounded-lg border border-tertiary bg-gradient-to-br from-secondary to-tertiary flex flex-col justify-between overflow-hidden">
        <div className="flex justify-between items-start">
            <span className="text-2xl">{insight.icon}</span>
            <button onClick={() => onDismiss(insight.id!)} title="Dismiss" className="text-text-muted hover:text-text-primary text-lg leading-none">&times;</button>
        </div>
        <div>
            <h4 className="font-semibold text-sm text-text-primary">{insight.title}</h4>
            <p className="text-xs text-text-secondary line-clamp-2">{insight.insight}</p>
        </div>
    </div>
);

const SmartInsights: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const allInsights = useSupabaseQuery<SmartInsight>('smart_insights');
    const insights = useMemo(() =>
        (allInsights ?? []).filter(i => i.status === 'active').sort((a, b) =>
            new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
        ),
        [allInsights]
    );

    const generateInsights = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Aggregate Data
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const allTransactions = await transactionsService.getAll();
            const transactions = allTransactions.filter(t => new Date(t.date) > thirtyDaysAgo);
            const habits = await habitsService.getAll();
            const habitLogs = await habitLogsService.getAll();
            const allHealthLogs = await healthLogsService.getAll();
            const healthLogs = allHealthLogs.filter(l => new Date(l.date) > thirtyDaysAgo);
            const allNotes = await notesService.getAll();
            const notesCount = allNotes.filter(n => new Date(n.createdAt) > thirtyDaysAgo).length;

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
            const activeInsights = (allInsights ?? []).filter(i => i.status === 'active');
            for (const insight of activeInsights) {
                if (insight.id) await smartInsightsService.update(insight.id, { status: 'dismissed' });
            }
            const newInsights: Omit<SmartInsight, 'id'>[] = jsonResponse.map((item: any) => ({
                ...item,
                generatedAt: new Date(),
                status: 'active' as const
            }));
            for (const insight of newInsights) {
                await smartInsightsService.create(insight as SmartInsight);
            }

        } catch (error) {
            console.error("Failed to generate insights:", error);
            // Optionally add a user-facing error message
        } finally {
            setIsLoading(false);
        }
    }, [allInsights]);

    useEffect(() => {
        const shouldGenerate = async () => {
            const activeInsights = (allInsights ?? []).filter(i => i.status === 'active');
            if (activeInsights.length === 0) {
                generateInsights();
            } else {
                const oneDayAgo = new Date();
                oneDayAgo.setDate(oneDayAgo.getDate() - 1);
                const latestInsight = activeInsights[0];
                if (new Date(latestInsight.generatedAt) < oneDayAgo) {
                    generateInsights();
                }
            }
        };
        shouldGenerate();
    }, [generateInsights, allInsights]);

    const handleDismiss = async (id: number) => {
        await smartInsightsService.update(id, { status: 'dismissed' });
    };
    
    return (
        <div className="mb-6">
             <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-text-primary flex items-center">
                    <span className="material-symbols-outlined text-accent mr-2 text-xl">lightbulb</span>
                    Smart Insights
                </h2>
                <button onClick={generateInsights} disabled={isLoading} className="flex items-center gap-1.5 bg-tertiary text-text-secondary text-xs font-medium px-3 py-1.5 rounded-md hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-wait transition-all">
                    <span className={`material-symbols-outlined text-sm ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
                    Refresh
                </button>
            </div>
            <div className="flex overflow-x-auto space-x-3 pb-3 scrollbar-thin">
                {isLoading && (!insights || insights.length === 0) && (
                    <div className="flex-shrink-0 w-56 h-32 rounded-lg border border-tertiary bg-secondary flex items-center justify-center">
                        <p className="text-text-muted text-sm">Generating...</p>
                    </div>
                )}
                {insights?.map(insight => (
                    <InsightCard key={insight.id} insight={insight} onDismiss={handleDismiss} />
                ))}
                {insights?.length === 0 && !isLoading && (
                    <div className="flex-shrink-0 w-56 h-32 rounded-lg border border-dashed border-tertiary bg-secondary flex items-center justify-center text-center p-3">
                        <p className="text-text-muted text-xs">No insights yet. Click Refresh!</p>
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
        className={`bg-secondary p-4 rounded-lg border border-tertiary flex flex-col justify-between transition-all duration-200 hover:border-accent hover:shadow-lg hover:shadow-accent/10 cursor-pointer animate-fade-in-up ${className}`}
    >
        <div>
            <div className="flex items-center text-text-secondary mb-3 text-sm">
                <span className="material-symbols-outlined text-lg mr-1.5">{icon}</span>
                <h3 className="font-semibold">{title}</h3>
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
    return (<div className="bg-primary p-3 rounded-lg border border-tertiary"><h3 className="font-semibold text-xs text-accent flex items-center"><span className="material-symbols-outlined text-sm mr-1">psychology</span>AI Insights</h3><p className="text-text-secondary text-xs mt-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong class="text-text-primary">$1</strong>') }}></p></div>);
};

const WeekdayPerformanceWidget: React.FC<{ habits: Habit[], habitLogs: HabitLog[] }> = ({ habits, habitLogs }) => {
    const data = useMemo(() => calculateWeekdayData(habits, habitLogs), [habits, habitLogs]);
    return (
        <div className="bg-primary p-3 rounded-lg border border-tertiary h-full min-h-[200px]">
            <h3 className="text-sm font-semibold mb-2 text-text-primary">Weekday Performance</h3>
            <div className="h-[calc(100%-2rem)] min-h-[160px]">
                <ResponsiveContainer width="100%" height="100%" minHeight={160}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} />
                        <YAxis stroke="#94A3B8" fontSize={10} unit="%" />
                        <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', fontSize: '12px' }} />
                        <Bar dataKey="rate" name="Completion" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const HabitPerformanceWidget: React.FC<{ habits: Habit[], habitLogs: HabitLog[] }> = ({ habits, habitLogs }) => {
    const data = useMemo(() => {
        const streaks = calculateStreaks(habits, habitLogs);
        return habits.map(h => ({ id: h.id!, name: h.name, 'Current Streak': streaks[h.id!]?.currentStreak ?? 0, 'Longest Streak': streaks[h.id!]?.longestStreak ?? 0, 'Completion Rate': calculateCompletionRate(h, habitLogs) }));
    }, [habits, habitLogs]);
    return (
        <div className="bg-primary p-3 rounded-lg border border-tertiary h-full flex flex-col">
            <h3 className="text-sm font-semibold mb-2 text-text-primary">Habit Performance</h3>
            <div className="flex-1 overflow-y-auto">
                <ul className="space-y-2">
                    {data.map(h => (
                        <li key={h.id} className="p-2 bg-secondary rounded-md">
                            <p className="font-semibold text-xs text-text-primary truncate">{h.name}</p>
                            <div className="flex justify-between items-center text-xs text-text-secondary mt-1">
                                <span>🔥 {h['Current Streak']}d</span>
                                <span>📈 {h['Longest Streak']}d</span>
                                <span>✓ {h['Completion Rate'].toFixed(0)}%</span>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
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
        <div className="bg-primary p-3 rounded-lg border border-tertiary">
            <h3 className="text-sm font-semibold mb-2 text-text-primary">Correlation Engine</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <select value={habitId} onChange={e => setHabitId(e.target.value)} className="bg-secondary border border-tertiary rounded-md py-1.5 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent">
                    <option value="">Select a Habit</option>
                    {habits.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
                <select value={metricId} onChange={e => setMetricId(e.target.value)} className="bg-secondary border border-tertiary rounded-md py-1.5 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent">
                    <option value="">Select a Health Metric</option>
                    {healthMetrics?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <div className="mt-2 p-2 bg-secondary rounded-md min-h-[50px]">
                <p className="text-text-secondary text-xs" dangerouslySetInnerHTML={{ __html: correlation.text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-text-primary">$1</strong>') }}></p>
            </div>
        </div>
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
        <div className="bg-primary p-3 rounded-lg border border-tertiary">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-text-primary">Health Trends</h3>
                <div className="flex gap-2">
                    <select value={metricId} onChange={e => setMetricId(e.target.value)} className="bg-secondary border border-tertiary rounded-md py-1 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent">
                        <option value="">Select Metric</option>
                        {metrics?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)} className="bg-secondary border border-tertiary rounded-md py-1 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent">
                        <option value="7d">7d</option>
                        <option value="30d">30d</option>
                        <option value="90d">90d</option>
                    </select>
                </div>
            </div>

            <div className="h-[240px] min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                        <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} />
                        <YAxis stroke="#94A3B8" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', fontSize: '11px' }} />
                        {metricId && <Line type="monotone" dataKey={metrics?.find(m=>m.id===Number(metricId))?.name} stroke="#3B82F6" strokeWidth={2} connectNulls dot={false} />}
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
            <div className="bg-primary p-3 rounded-lg border border-tertiary h-[280px] min-h-[280px]">
                <h3 className="text-sm font-semibold mb-2 text-text-primary">Cash Flow (30d)</h3>
                <div className="h-[240px] min-h-[240px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                        <LineChart data={cashFlowData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                            <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} hide />
                            <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value: number) => `$${value}`} />
                            <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', fontSize: '11px' }} cursor={{fill: 'rgba(255,255,255,0.1)'}}/>
                            <Line type="monotone" dataKey="Income" stroke="#10B981" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="Expenses" stroke="#EF4444" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-primary p-3 rounded-lg border border-tertiary h-[280px] min-h-[280px]">
                <h3 className="text-sm font-semibold mb-2 text-text-primary">Expense Breakdown</h3>
                <div className="h-[240px] min-h-[240px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                        <PieChart>
                            <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} fill="#8884d8" paddingAngle={3} labelLine={false} label={({ name, percent }: any) => `${name} ${((percent as number) * 100).toFixed(0)}%`}>
                                {categoryBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', fontSize: '11px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
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
        <div className="flex justify-between items-center mb-2">
            <button onClick={() => changeMonth(-1)} className="p-1 rounded-md hover:bg-secondary text-text-primary">
                <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <h3 className="text-sm font-semibold text-text-primary">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <button onClick={() => changeMonth(1)} className="p-1 rounded-md hover:bg-secondary text-text-primary">
                <span className="material-symbols-outlined text-lg">chevron_right</span>
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
            daysArray.push(<div key={`empty-${i}`} className="border-r border-b border-tertiary h-20"></div>);
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
                    className={`border-r border-b border-tertiary h-20 p-2 text-left hover:bg-secondary transition-colors ${
                        isToday ? 'bg-accent/10' : ''
                    }`}
                >
                    <div className="flex flex-col h-full">
                        <span className={`text-xs font-semibold mb-1 ${isToday ? 'text-accent' : 'text-text-primary'}`}>
                            {day}
                        </span>
                        <div className="flex-1 overflow-hidden flex flex-wrap gap-0.5">
                            {showHabits && dayHabitLogs.length > 0 && (
                                <div className="text-[10px] bg-green-500/30 text-green-200 px-1 py-0.5 rounded truncate">
                                    ✓{dayHabitLogs.length}
                                </div>
                            )}
                            {showFasting && dayFastingLog && (
                                <div className={`text-[10px] px-1 py-0.5 rounded truncate ${
                                    dayFastingLog.status === 'completed' ? 'bg-blue-500/30 text-blue-200' :
                                    dayFastingLog.status === 'missed' ? 'bg-red-500/30 text-red-200' :
                                    'bg-yellow-500/30 text-yellow-200'
                                }`}>
                                    🌙
                                </div>
                            )}
                            {showIslamic && majorEvents.length > 0 && (
                                <div className="text-[10px] bg-purple-500/30 text-purple-200 px-1 py-0.5 rounded truncate">
                                    🕌
                                </div>
                            )}
                            {showIslamic && dayIslamicEvent && (
                                <div className="text-[10px] bg-blue-500/30 text-blue-200 px-1 py-0.5 rounded truncate">
                                    📝
                                </div>
                            )}
                            {showReminders && dayReminders.length > 0 && (
                                <div className={`text-[10px] px-1 py-0.5 rounded truncate ${
                                    dayReminders.some(r => r.status === 'overdue') ? 'bg-red-500/30 text-red-200' :
                                    dayReminders.some(r => r.priority === 'high') ? 'bg-orange-500/30 text-orange-200' :
                                    'bg-cyan-500/30 text-cyan-200'
                                }`}>
                                    🔔{dayReminders.length}
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
            <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-text-secondary">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-1 border-r border-b border-tertiary">
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
                    await fastingLogsService.delete(dayFastingLog.id!);
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
                    await islamicEventsService.delete(dayIslamicEvent.id!);
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
                                {hijriDate.hDay} {hijriDate.hMonthName} {hijriDate.hYear} AH
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
                                        <p className="font-medium text-text-primary">{event}</p>
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
        <div className="space-y-3">
            <div className="flex gap-1.5 flex-wrap">
                {VIEWS.map(view => (
                    <button
                        key={view.id}
                        onClick={() => setActiveView(view.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            activeView === view.id
                                ? 'bg-accent text-white'
                                : 'bg-tertiary text-text-secondary hover:bg-opacity-80'
                        }`}
                    >
                        <span className="mr-1">{view.icon}</span>
                        {view.label}
                    </button>
                ))}
            </div>

            <div className="bg-primary p-3 rounded-lg border border-tertiary">
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
    if (!habits || !habitLogs) return <div className="text-center p-4 text-text-muted text-sm">Loading analytics data...</div>;

    return (
        <div className="space-y-4">
            {/* Smart Insights - Moved from main dashboard */}
            <SmartInsights />

            {/* AI Insights - Moved from Quick Analytics */}
            {habits.length > 0 && (
                <AIInsightsWidget habits={habits} habitLogs={habitLogs} />
            )}

            <div className="space-y-4">
                {/* Habit Analytics */}
                <div>
                    <h3 className="text-sm font-semibold mb-2 text-accent flex items-center">
                        <span className="material-symbols-outlined text-base mr-1">bar_chart</span>
                        Habit Analytics
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="h-[280px]">
                            <WeekdayPerformanceWidget habits={habits} habitLogs={habitLogs} />
                        </div>
                        <div className="h-[280px]">
                            <HabitPerformanceWidget habits={habits} habitLogs={habitLogs} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <CorrelationEngineWidget habits={habits} habitLogs={habitLogs} healthMetrics={healthMetrics} healthLogs={healthLogs} />
                    </div>
                </div>

                {/* Health Analytics */}
                {healthMetrics && healthLogs && (
                    <div>
                        <h3 className="text-sm font-semibold mb-2 text-accent flex items-center">
                            <span className="material-symbols-outlined text-base mr-1">favorite</span>
                            Health Analytics
                        </h3>
                        <HealthAnalyticsWidget metrics={healthMetrics} logs={healthLogs} />
                    </div>
                )}

                {/* Finance Analytics */}
                {transactions && categories && (
                    <div>
                        <h3 className="text-sm font-semibold mb-2 text-accent flex items-center">
                            <span className="material-symbols-outlined text-base mr-1">payments</span>
                            Finance Analytics
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <FinanceAnalyticsWidget transactions={transactions} categories={categories} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const Dashboard: React.FC<{ setActiveModule: (module: Module) => void }> = ({ setActiveModule }) => {

    // --- Data Hooks ---
    const accounts = useSupabaseQuery<Account>('accounts');
    const transactions = useSupabaseQuery<Transaction>('transactions');
    const categories = useSupabaseQuery<Category>('categories');
    const habits = useSupabaseQuery<Habit>('habits');
    const habitLogs = useSupabaseQuery<HabitLog>('habit_logs');
    const healthMetrics = useSupabaseQuery<HealthMetric>('health_metrics');
    const healthLogs = useSupabaseQuery<HealthLog>('health_logs');
    const allNotes = useSupabaseQuery<Note>('notes');
    const notes = useMemo(() => {
        const activeNotes = (allNotes ?? []).filter(n => n.status === 'active');
        return activeNotes.sort((a, b) => {
            const aTime = a.updatedAt ? (typeof a.updatedAt === 'string' ? new Date(a.updatedAt).getTime() : a.updatedAt.getTime()) : 0;
            const bTime = b.updatedAt ? (typeof b.updatedAt === 'string' ? new Date(b.updatedAt).getTime() : b.updatedAt.getTime()) : 0;
            return bTime - aTime;
        }).slice(0, 3);
    }, [allNotes]);
    const fastingLogs = useSupabaseQuery<FastingLog>('fasting_logs');
    const islamicEvents = useSupabaseQuery<IslamicEvent>('islamic_events');
    const reminders = useSupabaseQuery<Reminder>('reminders');
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const allDailyReflections = useSupabaseQuery<DailyReflection>('daily_reflections');
    const dailyReflection = useMemo(() => allDailyReflections?.find(r => r.date === todayStr), [allDailyReflections, todayStr]);

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
        const ayah = dailyReflection?.content && typeof dailyReflection.content === 'object' ? (dailyReflection.content as any).ayah : undefined;
        return {
            fastingStatus: fastLog ? `Today's Fast: ${fastLog.status}` : 'No Fast Logged',
            dailyAyah: ayah
        }
    }, [fastingLogs, dailyReflection, todayStr]);


    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-accent to-purple bg-clip-text text-transparent">Dashboard</h1>
                <div className="text-sm text-text-muted">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Overview Cards Section - Compact Grid */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center">
                    <span className="material-symbols-outlined text-accent mr-2 text-xl">dashboard</span>
                    Quick Overview
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                
                <DashboardCard title="Finance" icon="payments" onClick={() => setActiveModule(Module.FINANCE)} style={{ animationDelay: '50ms' }}>
                    <p className="text-2xl font-bold text-text-primary">{formatCurrency(financeData.balance)}</p>
                    <div className="text-xs mt-2 space-y-1">
                        <div className="flex justify-between text-text-muted">
                            <span className="text-success">↑ {formatCurrency(financeData.income)}</span>
                            <span className="text-error">↓ {formatCurrency(financeData.expense)}</span>
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard title="Habits" icon="check_circle" onClick={() => setActiveModule(Module.HABITS)} style={{ animationDelay: '100ms' }}>
                    <p className="text-2xl font-bold text-text-primary">{habitData.completion.toFixed(0)}%</p>
                    <div className="w-full bg-tertiary rounded-full h-1.5 my-2">
                        <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${habitData.completion}%` }}></div>
                    </div>
                    <div className="flex items-center text-xs text-warning">
                        <span className="material-symbols-outlined text-sm">local_fire_department</span>
                        <span className="ml-1">{habitData.activeStreak} days</span>
                    </div>
                </DashboardCard>

                <DashboardCard title="Health" icon="favorite" onClick={() => setActiveModule(Module.HEALTH)} style={{ animationDelay: '150ms' }}>
                    <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-text-muted">Steps</span>
                            <span className="font-semibold text-text-primary">{healthData.steps?.value ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-text-muted">Sleep</span>
                            <span className="font-semibold text-text-primary">{healthData.sleep?.value ?? 'N/A'} {healthData.sleep?.unit}</span>
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard title="Islamic" icon="mosque" onClick={() => setActiveModule(Module.ISLAMIC)} style={{ animationDelay: '200ms' }}>
                    <p className="text-xs text-text-secondary line-clamp-2 italic">"{islamicData.dailyAyah ?? 'No reflection yet'}"</p>
                    <p className="text-xs text-text-muted mt-2">{islamicData.fastingStatus}</p>
                </DashboardCard>

                <DashboardCard title="Notes" icon="note" onClick={() => setActiveModule(Module.NOTES)} style={{ animationDelay: '250ms' }}>
                    <div className="space-y-1">
                        {notes?.slice(0, 2).map(note => (
                            <p key={note.id} className="text-xs text-text-primary truncate">• {note.title}</p>
                        ))}
                        {(!notes || notes.length === 0) && <p className="text-xs text-text-muted">No notes</p>}
                    </div>
                </DashboardCard>

                <DashboardCard title="Reminders" icon="notifications" onClick={() => setActiveModule(Module.REMINDERS)} style={{ animationDelay: '300ms' }}>
                    <p className="text-2xl font-bold text-text-primary">{reminders?.filter(r => !r.completed).length ?? 0}</p>
                    <p className="text-xs text-text-muted mt-1">Active reminders</p>
                </DashboardCard>
                </div>
            </div>

            {/* Calendar & Analytics in Two Columns */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-6">
                {/* Calendar Section */}
                <div className="bg-secondary p-3 rounded-lg border border-tertiary">
                    <h2 className="text-sm font-semibold text-text-primary mb-2 flex items-center">
                        <span className="material-symbols-outlined text-accent mr-1.5 text-lg">calendar_month</span>
                        Calendar
                    </h2>
                    <div className="h-[580px] overflow-y-auto">
                        <CalendarTab
                            habits={habits}
                            habitLogs={habitLogs}
                            fastingLogs={fastingLogs}
                            islamicEvents={islamicEvents}
                            reminders={reminders}
                        />
                    </div>
                </div>

                {/* Quick Analytics */}
                <div className="bg-secondary p-3 rounded-lg border border-tertiary">
                    <h2 className="text-sm font-semibold text-text-primary mb-2 flex items-center">
                        <span className="material-symbols-outlined text-accent mr-1.5 text-lg">analytics</span>
                        Weekday Performance
                    </h2>
                    <div className="h-[580px]">
                        {habits && habitLogs && habits.length > 0 ? (
                            <WeekdayPerformanceWidget habits={habits} habitLogs={habitLogs} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-text-muted text-sm">
                                No habit data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Full Analytics Section - Collapsible */}
            <details className="group">
                <summary className="cursor-pointer list-none">
                    <div className="bg-secondary p-4 rounded-lg border border-tertiary hover:border-accent transition-colors">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-text-primary flex items-center">
                                <span className="material-symbols-outlined text-accent mr-2 text-xl">bar_chart</span>
                                Detailed Analytics
                            </h2>
                            <span className="material-symbols-outlined text-text-muted group-open:rotate-180 transition-transform">
                                expand_more
                            </span>
                        </div>
                    </div>
                </summary>
                <div className="mt-4">
                    <AnalyticsTab
                        habits={habits}
                        habitLogs={habitLogs}
                        healthMetrics={healthMetrics}
                        healthLogs={healthLogs}
                        transactions={transactions}
                        categories={categories}
                    />
                </div>
            </details>
        </div>
    );
};

export default Dashboard;