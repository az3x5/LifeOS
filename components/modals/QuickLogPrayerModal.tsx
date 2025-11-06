import React, { useMemo } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { PrayerLog, Habit, HabitLog, Setting } from '../../types';
import { prayerLogsService, habitsService, habitLogsService, settingsService } from '../../services/dataService';

interface QuickLogPrayerModalProps {
    closeModal: () => void;
}

const PRAYERS: PrayerLog['prayer'][] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const getTodayDateString = () => new Date().toISOString().split('T')[0];

const QuickLogPrayerModal: React.FC<QuickLogPrayerModalProps> = ({ closeModal }) => {
    const todayStr = useMemo(() => getTodayDateString(), []);
    const allPrayerLogs = useSupabaseQuery<PrayerLog>('prayer_logs');
    const prayerLogs = useMemo(() => (allPrayerLogs ?? []).filter(p => p.date === todayStr), [allPrayerLogs, todayStr]);
    const loggedPrayers = useMemo(() => new Set(prayerLogs?.map(p => p.prayer) ?? []), [prayerLogs]);
    
    const syncPrayerHabitLog = async (prayerName: PrayerLog['prayer'], date: string) => {
        const allSettings = await settingsService.getAll();
        const integrationSetting = allSettings.find(s => s.key === 'islamicHabitIntegration');
        const integrationEnabled = integrationSetting?.value;
        if (!integrationEnabled) return;

        const allHabits = await habitsService.getAll();
        const prayerHabit = allHabits.find(h => h.origin === 'system-islamic' && h.name === prayerName);
        if (!prayerHabit) return;

        const allLogs = await habitLogsService.getAll();
        const habitLogExists = allLogs.find(l => l.habitId === prayerHabit.id! && l.date === date);
        if (!habitLogExists) {
            await habitLogsService.create({ habitId: prayerHabit.id!, date } as HabitLog);
        }
    };

    const handleLogPrayer = async (prayer: PrayerLog['prayer']) => {
        if (loggedPrayers.has(prayer)) return;

        await prayerLogsService.create({ date: todayStr, prayer });
        await syncPrayerHabitLog(prayer, todayStr);
    };

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Log Today's Prayers</h2>
                    <button onClick={closeModal} className="p-1 -mr-2 text-2xl">&times;</button>
                </div>
                <div className="space-y-3">
                    {PRAYERS.map(prayer => {
                        const isLogged = loggedPrayers.has(prayer);
                        return (
                            <button
                                key={prayer}
                                onClick={() => handleLogPrayer(prayer)}
                                disabled={isLogged}
                                className={`w-full flex items-center justify-between p-4 rounded-lg text-left transition-colors
                                    ${isLogged 
                                        ? 'bg-accent/40 cursor-not-allowed' 
                                        : 'bg-primary hover:bg-tertiary'
                                    }`}
                            >
                                <span className="font-semibold text-lg text-text-primary">{prayer}</span>
                                {isLogged && (
                                    <div className="flex items-center text-accent">
                                        <span className="material-symbols-outlined text-xl">check_circle</span>
                                        <span className="ml-2 text-sm font-semibold">Logged</span>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default QuickLogPrayerModal;