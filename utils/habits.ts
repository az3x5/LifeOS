
import { Habit, HabitLog } from '../types';

export const calculateStreaks = (habits: Habit[], logs: HabitLog[]): { [id: number]: { currentStreak: number; longestStreak: number; } } => {
    const streaks: { [id: number]: { currentStreak: number; longestStreak: number; } } = {};
    if (!habits || !logs) return streaks;

    const sortedLogs = logs.sort((a: HabitLog, b: HabitLog) => {
        const aDate = typeof a.date === 'string' ? a.date : new Date(a.date).toISOString().split('T')[0];
        const bDate = typeof b.date === 'string' ? b.date : new Date(b.date).toISOString().split('T')[0];
        return aDate.localeCompare(bDate);
    });

    for (const habit of habits) {
        let currentStreak = 0;
        let longestStreak = 0;
        const habitLogs = sortedLogs.filter(log => log.habitId === habit.id);

        if (habitLogs.length > 0) {
            // Calculate current streak
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            const todayStr = today.toISOString().split('T')[0];
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const hasLogToday = habitLogs.some(l => {
                const logDate = typeof l.date === 'string' ? l.date : new Date(l.date).toISOString().split('T')[0];
                return logDate === todayStr;
            });
            const hasLogYesterday = habitLogs.some(l => {
                const logDate = typeof l.date === 'string' ? l.date : new Date(l.date).toISOString().split('T')[0];
                return logDate === yesterdayStr;
            });

            if (hasLogToday || hasLogYesterday) {
                let lastDate = new Date();
                if (!hasLogToday) {
                    lastDate.setDate(lastDate.getDate() - 1);
                }

                for (let i = habitLogs.length - 1; i >= 0; i--) {
                    const logDate = new Date(habitLogs[i].date);
                    logDate.setHours(12, 0, 0, 0); // Normalize time to avoid timezone issues

                    if (habit.isFrozen && habit.frozenFrom && habit.frozenTo) {
                        const from = new Date(habit.frozenFrom);
                        from.setHours(12, 0, 0, 0);
                        const to = new Date(habit.frozenTo);
                        to.setHours(12, 0, 0, 0);
                        if (logDate >= from && logDate <= to) continue;
                    }
                    
                    const diff = (lastDate.getTime() - logDate.getTime()) / (1000 * 3600 * 24);

                    if (diff <= 1) {
                        currentStreak++;
                        lastDate = logDate;
                    } else {
                        break; 
                    }
                }
            }

            // Calculate longest streak
            longestStreak = 1;
            let tempStreak = 1;
            for (let i = 1; i < habitLogs.length; i++) {
                const currentDate = new Date(habitLogs[i].date);
                currentDate.setHours(12, 0, 0, 0);
                const prevDate = new Date(habitLogs[i - 1].date);
                prevDate.setHours(12, 0, 0, 0);
                
                if (habit.isFrozen && habit.frozenFrom && habit.frozenTo) {
                     const from = new Date(habit.frozenFrom);
                     from.setHours(12, 0, 0, 0);
                     const to = new Date(habit.frozenTo);
                     to.setHours(12, 0, 0, 0);
                     if (currentDate >= from && currentDate <= to) continue;
                }

                const diff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24);
                
                if (diff === 1) {
                    tempStreak++;
                } else {
                    tempStreak = 1;
                }

                if (tempStreak > longestStreak) {
                    longestStreak = tempStreak;
                }
            }
        }
        
        streaks[habit.id!] = { currentStreak, longestStreak };
    }
    return streaks;
};
