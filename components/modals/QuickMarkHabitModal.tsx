import React, { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { Habit, HabitLog } from '../../types';
import { habitLogsService } from '../../services/dataService';

interface QuickMarkHabitModalProps {
    closeModal: () => void;
}

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const QuickMarkHabitModal: React.FC<QuickMarkHabitModalProps> = ({ closeModal }) => {
    const todayStr = useMemo(() => getTodayDateString(), []);
    const todayDay = useMemo(() => new Date().getDay(), []);
    
    const allHabits = useSupabaseQuery<Habit>('habits');
    const allHabitLogs = useSupabaseQuery<HabitLog>('habit_logs');

    const habits = useMemo(() => allHabits ?? [], [allHabits]);
    const habitLogs = useMemo(() => (allHabitLogs ?? []).filter(l => l.date === todayStr), [allHabitLogs, todayStr]);

    const [selectedHabitIds, setSelectedHabitIds] = useState<Set<number>>(new Set());

    const todaysHabits = useMemo(() => {
        if (!habits) return [];
        return habits.filter(h => h.frequency === 'daily' || h.daysOfWeek?.includes(todayDay));
    }, [habits, todayDay]);

    const uncompletedHabits = useMemo(() => {
        if (!habitLogs || !todaysHabits) return [];
        const completedIds = new Set(habitLogs.map(l => l.habitId));
        return todaysHabits.filter(h => !completedIds.has(h.id!));
    }, [habitLogs, todaysHabits]);
    
    const handleToggleHabit = (habitId: number) => {
        setSelectedHabitIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(habitId)) {
                newSet.delete(habitId);
            } else {
                newSet.add(habitId);
            }
            return newSet;
        });
    };

    const handleSubmit = async () => {
        if (selectedHabitIds.size === 0) {
            closeModal();
            return;
        }

        const logsToAdd = Array.from(selectedHabitIds).map(habitId => ({
            habitId,
            date: todayStr
        }));

        for (const log of logsToAdd) {
            await habitLogsService.create(log as HabitLog);
        }
        closeModal();
    };

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6">Mark Today's Habits</h2>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                    {uncompletedHabits.length > 0 ? uncompletedHabits.map(habit => (
                        <div key={habit.id} onClick={() => handleToggleHabit(habit.id!)}
                             className="flex items-center p-3 bg-primary rounded-lg cursor-pointer hover:bg-tertiary/60">
                            <div className={`w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center mr-3
                                ${selectedHabitIds.has(habit.id!) ? 'bg-accent border-accent text-white' : 'border-text-muted'}`}>
                                {selectedHabitIds.has(habit.id!) && <span className="material-symbols-outlined text-base">check</span>}
                            </div>
                            <span className="text-text-primary">{habit.name}</span>
                        </div>
                    )) : <p className="text-text-muted text-center">All habits for today are completed!</p>}
                </div>
                <div className="flex justify-end space-x-4 pt-6">
                    <button type="button" onClick={closeModal} className="bg-tertiary hover:bg-opacity-80 text-text-secondary py-2 px-6 rounded-lg">Cancel</button>
                    <button type="button" onClick={handleSubmit} className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg">Save</button>
                </div>
            </div>
        </div>
    );
};

export default QuickMarkHabitModal;