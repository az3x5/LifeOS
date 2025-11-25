import React, { useMemo } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { PrayerLog, FastingLog, LearningLog } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PrayerTimes from './PrayerTimes';

interface IslamicDashboardProps {
    onNavigate: (tab: string) => void;
}

const IslamicDashboard: React.FC<IslamicDashboardProps> = ({ onNavigate }) => {
    const prayerLogs = useSupabaseQuery<PrayerLog>('prayer_logs') || [];
    const fastingLogs = useSupabaseQuery<FastingLog>('fasting_logs') || [];
    const learningLogs = useSupabaseQuery<LearningLog>('learning_logs') || [];

    // Calculate stats
    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        });

        const todayPrayers = prayerLogs.filter(p => p.date === today).length;
        const weekPrayers = prayerLogs.filter(p => last7Days.includes(p.date)).length;
        const totalFasting = fastingLogs.filter(f => f.status === 'completed').length;
        const learningStreak = learningLogs.length;

        return {
            todayPrayers,
            weekPrayers,
            totalFasting,
            learningStreak,
            totalPrayers: prayerLogs.length,
        };
    }, [prayerLogs, fastingLogs, learningLogs]);

    // Prayer completion data for chart
    const prayerChartData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        return last7Days.map(date => {
            const dayPrayers = prayerLogs.filter(p => p.date === date);
            return {
                date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                completed: dayPrayers.length,
            };
        });
    }, [prayerLogs]);

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-secondary border border-tertiary rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-muted text-sm">Today's Prayers</p>
                            <p className="text-3xl font-bold text-accent mt-1">{stats.todayPrayers}/5</p>
                        </div>
                        <span className="material-symbols-outlined text-5xl text-accent opacity-20">mosque</span>
                    </div>
                </div>

                <div className="bg-secondary border border-tertiary rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-muted text-sm">Week Prayers</p>
                            <p className="text-3xl font-bold text-blue-500 mt-1">{stats.weekPrayers}/35</p>
                        </div>
                        <span className="material-symbols-outlined text-5xl text-blue-500 opacity-20">calendar_month</span>
                    </div>
                </div>

                <div className="bg-secondary border border-tertiary rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-muted text-sm">Fasting Days</p>
                            <p className="text-3xl font-bold text-purple-500 mt-1">{stats.totalFasting}</p>
                        </div>
                        <span className="material-symbols-outlined text-5xl text-purple-500 opacity-20">nightlight</span>
                    </div>
                </div>

                <div className="bg-secondary border border-tertiary rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-muted text-sm">Learning Days</p>
                            <p className="text-3xl font-bold text-green-500 mt-1">{stats.learningStreak}</p>
                        </div>
                        <span className="material-symbols-outlined text-5xl text-green-500 opacity-20">book</span>
                    </div>
                </div>
            </div>

            {/* Prayer Times */}
            <PrayerTimes />

            {/* Prayer Chart */}
            <div className="bg-secondary border border-tertiary rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">7-Day Prayer Completion</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={prayerChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" domain={[0, 5]} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                            labelStyle={{ color: '#f3f4f6' }}
                        />
                        <Bar dataKey="completed" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Quick Access */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                    onClick={() => onNavigate('Quran Explorer')}
                    className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                    <span className="material-symbols-outlined text-5xl mb-2">menu_book</span>
                    <h3 className="text-xl font-bold">Read Quran</h3>
                    <p className="text-sm opacity-90 mt-1">114 Surahs with translations</p>
                </button>

                <button
                    onClick={() => onNavigate('Hadith Browser')}
                    className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                    <span className="material-symbols-outlined text-5xl mb-2">library_books</span>
                    <h3 className="text-xl font-bold">Browse Hadith</h3>
                    <p className="text-sm opacity-90 mt-1">Sahih Bukhari & Muslim</p>
                </button>

                <button
                    onClick={() => onNavigate('Dua Collection')}
                    className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                    <span className="material-symbols-outlined text-5xl mb-2">volunteer_activism</span>
                    <h3 className="text-xl font-bold">Duas & Dhikr</h3>
                    <p className="text-sm opacity-90 mt-1">Authentic supplications</p>
                </button>
            </div>
        </div>
    );
};

export default IslamicDashboard;

