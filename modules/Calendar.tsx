import React, { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { Habit, HabitLog, FastingLog, IslamicEvent } from '../types';
import { habitLogsService, fastingLogsService, islamicEventsService } from '../services/dataService';
import { gregorianToHijri, getMajorEventsForDate } from '../utils/islamic-calendar';
import ConfirmModal from '../components/modals/ConfirmModal';

type CalendarView = 'all' | 'habits' | 'fasting' | 'islamic';

const VIEWS = [
    { id: 'all' as CalendarView, label: 'All Events', icon: '📅' },
    { id: 'habits' as CalendarView, label: 'Habits', icon: '✓' },
    { id: 'fasting' as CalendarView, label: 'Fasting', icon: '🌙' },
    { id: 'islamic' as CalendarView, label: 'Islamic Events', icon: '🕌' },
];

const Calendar: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeView, setActiveView] = useState<CalendarView>('all');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null>(null);

    const habits = useSupabaseQuery<Habit>('habits');
    const habitLogs = useSupabaseQuery<HabitLog>('habit_logs');
    const fastingLogs = useSupabaseQuery<FastingLog>('fasting_logs');
    const islamicEvents = useSupabaseQuery<IslamicEvent>('islamic_events');

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
                <h1 className="text-4xl font-bold text-text-primary">Calendar</h1>
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
    onDayClick: (date: string) => void;
}> = ({ currentDate, activeView, habits, habitLogs, fastingLogs, islamicEvents, onDayClick }) => {
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

            const showHabits = activeView === 'all' || activeView === 'habits';
            const showFasting = activeView === 'all' || activeView === 'fasting';
            const showIslamic = activeView === 'all' || activeView === 'islamic';

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
                                    🕌 {majorEvents[0]}
                                </div>
                            )}
                            {showIslamic && dayIslamicEvent && (
                                <div className="text-xs bg-blue-500/30 text-blue-200 px-1 rounded truncate">
                                    📝 Note
                                </div>
                            )}
                        </div>
                    </div>
                </button>
            );
        }

        return daysArray;
    }, [currentDate, activeView, habits, habitLogs, fastingLogs, islamicEvents, onDayClick]);

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
    onClose: () => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({ date, activeView, habits, habitLogs, fastingLogs, islamicEvents, onClose, setConfirmModal }) => {
    const dateObj = new Date(date + 'T00:00:00');
    const dayHabitLogs = habitLogs?.filter(log => log.date === date) || [];
    const dayFastingLog = fastingLogs?.find(log => log.date === date);
    const dayIslamicEvent = islamicEvents?.find(event => event.gregorianDate === date);
    const majorEvents = getMajorEventsForDate(dateObj);
    const hijriDate = gregorianToHijri(dateObj);

    const showHabits = activeView === 'all' || activeView === 'habits';
    const showFasting = activeView === 'all' || activeView === 'fasting';
    const showIslamic = activeView === 'all' || activeView === 'islamic';

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

                    {!dayHabitLogs.length && !dayFastingLog && !majorEvents.length && !dayIslamicEvent && (
                        <p className="text-center text-text-muted py-8">No events on this day</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Calendar;

