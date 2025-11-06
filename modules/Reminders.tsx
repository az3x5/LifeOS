import React, { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { Reminder } from '../types';
import { remindersService } from '../services/dataService';
import ConfirmModal from '../components/modals/ConfirmModal';

type ReminderFilter = 'all' | 'pending' | 'completed' | 'overdue';
type ReminderSort = 'dueDate' | 'priority' | 'created';

// --- ICONS ---
const MenuIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>menu</span>;
const BellIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>notifications</span>;
const CheckCircleIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>check_circle</span>;
const ClockIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>schedule</span>;
const AlertIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>error</span>;
const MoreVertIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>more_vert</span>;
const DeleteIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>delete</span>;
const AddIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>add</span>;

const Reminders: React.FC = () => {
    const reminders = useSupabaseQuery<Reminder>('reminders');
    const [selectedReminderId, setSelectedReminderId] = useState<number | null>(null);
    const [reminderFilter, setReminderFilter] = useState<ReminderFilter>('all');
    const [reminderSort, setReminderSort] = useState<ReminderSort>('dueDate');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null>(null);

    // Update overdue status
    useMemo(() => {
        if (!reminders) return;
        const now = new Date();
        reminders.forEach(async (reminder) => {
            if (reminder.status === 'pending' && new Date(reminder.dueDate) < now) {
                await remindersService.update(reminder.id!, { status: 'overdue' });
            }
        });
    }, [reminders]);

    const selectedReminder = useMemo(() => {
        return reminders?.find(r => r.id === selectedReminderId) || null;
    }, [reminders, selectedReminderId]);

    const handleNewReminder = async () => {
        const newReminder = await remindersService.create({
            title: 'New Reminder',
            description: '',
            dueDate: new Date(),
            priority: 'medium',
            category: 'personal',
            status: 'pending',
            recurring: 'none',
            notificationEnabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        } as Reminder);
        if (newReminder && newReminder.id) {
            setSelectedReminderId(newReminder.id);
            setIsSidebarOpen(false);
        }
    };

    const handleSelectReminder = (id: number | null) => {
        setSelectedReminderId(id);
        setIsSidebarOpen(false);
    };

    const handleDeleteReminder = async (reminder: Reminder) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Reminder',
            message: `Are you sure you want to delete "${reminder.title}"?`,
            icon: '🗑️',
            onConfirm: async () => {
                await remindersService.delete(reminder.id!);
                if (selectedReminderId === reminder.id) {
                    setSelectedReminderId(null);
                }
                setConfirmModal(null);
            }
        });
    };

    const handleToggleComplete = async (reminder: Reminder) => {
        const newStatus = reminder.status === 'completed' ? 'pending' : 'completed';
        await remindersService.update(reminder.id!, {
            status: newStatus,
            completedAt: newStatus === 'completed' ? new Date() : undefined,
        });
    };

    return (
        <div className="flex h-full bg-primary font-sans relative overflow-hidden">
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}
            <Sidebar
                reminders={reminders}
                reminderFilter={reminderFilter}
                setReminderFilter={setReminderFilter}
                reminderSort={reminderSort}
                setReminderSort={setReminderSort}
                selectedReminderId={selectedReminderId}
                setSelectedReminderId={handleSelectReminder}
                onNewReminder={handleNewReminder}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isSidebarOpen={isSidebarOpen}
                onDeleteReminder={handleDeleteReminder}
                onToggleComplete={handleToggleComplete}
            />
            <main className="flex-1 flex flex-col min-w-0">
                {selectedReminder ? (
                    <EditorPanel
                        reminder={selectedReminder}
                        toggleSidebar={() => setIsSidebarOpen(p => !p)}
                        onDelete={handleDeleteReminder}
                        onToggleComplete={handleToggleComplete}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-text-muted bg-primary relative">
                        <button onClick={() => setIsSidebarOpen(true)} title="Open reminders list" className="md:hidden absolute top-4 left-4 p-2 rounded-md text-text-primary bg-secondary border border-tertiary">
                            <MenuIcon className="text-2xl" />
                        </button>
                        <div className="text-center">
                            <BellIcon className="text-6xl mx-auto text-tertiary" />
                            <h2 className="mt-4 text-xl font-semibold">Select a reminder</h2>
                            <p>Choose a reminder from the list to view or edit it.</p>
                        </div>
                    </div>
                )}
            </main>

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
        </div>
    );
};

const Sidebar: React.FC<{
    reminders?: Reminder[];
    reminderFilter: ReminderFilter;
    setReminderFilter: (f: ReminderFilter) => void;
    reminderSort: ReminderSort;
    setReminderSort: (s: ReminderSort) => void;
    selectedReminderId: number | null;
    setSelectedReminderId: (id: number | null) => void;
    onNewReminder: () => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    isSidebarOpen: boolean;
    onDeleteReminder: (reminder: Reminder) => void;
    onToggleComplete: (reminder: Reminder) => void;
}> = (props) => {
    const filteredReminders = useMemo(() => {
        let tempReminders = props.reminders ?? [];

        switch (props.reminderFilter) {
            case 'pending':
                tempReminders = tempReminders.filter(r => r.status === 'pending');
                break;
            case 'completed':
                tempReminders = tempReminders.filter(r => r.status === 'completed');
                break;
            case 'overdue':
                tempReminders = tempReminders.filter(r => r.status === 'overdue');
                break;
        }

        if (props.searchQuery) {
            const q = props.searchQuery.toLowerCase();
            tempReminders = tempReminders.filter(r =>
                r.title.toLowerCase().includes(q) ||
                r.description?.toLowerCase().includes(q)
            );
        }

        // Sort
        tempReminders.sort((a, b) => {
            switch (props.reminderSort) {
                case 'priority':
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
                case 'created':
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                case 'dueDate':
                default:
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }
        });

        return tempReminders;
    }, [props.reminders, props.reminderFilter, props.reminderSort, props.searchQuery]);

    return (
        <div className={`w-72 md:w-80 bg-secondary border-r border-tertiary flex flex-col transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 fixed inset-y-0 left-0 z-30 ${props.isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-3 flex-shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Reminders</h1>
                    <button onClick={props.onNewReminder} title="New Reminder" className="p-2 rounded-md hover:bg-tertiary">
                        <AddIcon className="text-xl" />
                    </button>
                </div>
                <input
                    type="text"
                    placeholder="Search reminders..."
                    value={props.searchQuery}
                    onChange={e => props.setSearchQuery(e.target.value)}
                    className="w-full bg-primary border border-tertiary rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
            </div>

            <div className="px-3 pb-2 space-y-1 border-b border-tertiary">
                <NavItem icon={<BellIcon className="text-xl" />} label="All" isActive={props.reminderFilter === 'all'} onClick={() => props.setReminderFilter('all')} />
                <NavItem icon={<ClockIcon className="text-xl" />} label="Pending" isActive={props.reminderFilter === 'pending'} onClick={() => props.setReminderFilter('pending')} />
                <NavItem icon={<CheckCircleIcon className="text-xl" />} label="Completed" isActive={props.reminderFilter === 'completed'} onClick={() => props.setReminderFilter('completed')} />
                <NavItem icon={<AlertIcon className="text-xl" />} label="Overdue" isActive={props.reminderFilter === 'overdue'} onClick={() => props.setReminderFilter('overdue')} />
            </div>

            <div className="px-3 py-2 border-b border-tertiary text-xs text-text-secondary">
                <label className="block mb-2">Sort by:</label>
                <select
                    value={props.reminderSort}
                    onChange={e => props.setReminderSort(e.target.value as ReminderSort)}
                    className="w-full bg-primary border border-tertiary rounded px-2 py-1 text-xs"
                >
                    <option value="dueDate">Due Date</option>
                    <option value="priority">Priority</option>
                    <option value="created">Created</option>
                </select>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
                {filteredReminders.length === 0 ? (
                    <div className="text-center text-text-secondary py-8">
                        <BellIcon className="text-4xl mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No reminders</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredReminders.map(reminder => (
                            <ReminderItem
                                key={reminder.id}
                                reminder={reminder}
                                isSelected={props.selectedReminderId === reminder.id}
                                onSelect={() => props.setSelectedReminderId(reminder.id!)}
                                onDelete={() => props.onDeleteReminder(reminder)}
                                onToggleComplete={() => props.onToggleComplete(reminder)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ReminderItem: React.FC<{
    reminder: Reminder;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onToggleComplete: () => void;
}> = ({ reminder, isSelected, onSelect, onDelete, onToggleComplete }) => {
    const [showMenu, setShowMenu] = useState(false);
    const priorityColors = { high: 'text-red-500', medium: 'text-yellow-500', low: 'text-green-500' };

    return (
        <div
            onClick={onSelect}
            className={`p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-accent/20 border border-accent' : 'hover:bg-tertiary border border-transparent'}`}
        >
            <div className="flex items-start gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
                    className={`mt-1 flex-shrink-0 ${reminder.status === 'completed' ? 'text-accent' : 'text-tertiary'}`}
                >
                    <CheckCircleIcon className="text-lg" />
                </button>
                <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold truncate ${reminder.status === 'completed' ? 'line-through text-text-secondary' : ''}`}>
                        {reminder.title}
                    </h3>
                    <p className="text-xs text-text-secondary truncate">{new Date(reminder.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1">
                    <span className={`text-xs font-semibold ${priorityColors[reminder.priority as keyof typeof priorityColors]}`}>
                        {reminder.priority.charAt(0).toUpperCase()}
                    </span>
                    <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="p-1 hover:bg-tertiary rounded">
                            <MoreVertIcon className="text-lg" />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-secondary border border-tertiary rounded-lg shadow-lg z-50">
                                <button onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-tertiary flex items-center gap-2">
                                    <DeleteIcon className="text-lg" /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:bg-tertiary'}`}
    >
        {icon}
        <span className="font-medium">{label}</span>
    </button>
);

const EditorPanel: React.FC<{
    reminder: Reminder;
    toggleSidebar: () => void;
    onDelete: (reminder: Reminder) => void;
    onToggleComplete: (reminder: Reminder) => void;
}> = ({ reminder, toggleSidebar, onDelete, onToggleComplete }) => {
    const [title, setTitle] = useState(reminder.title);
    const [description, setDescription] = useState(reminder.description || '');
    const [dueDate, setDueDate] = useState(reminder.dueDate instanceof Date ? reminder.dueDate.toISOString().split('T')[0] : '');
    const [dueTime, setDueTime] = useState(reminder.dueTime || '');
    const [priority, setPriority] = useState(reminder.priority);
    const [category, setCategory] = useState(reminder.category);
    const [recurring, setRecurring] = useState(reminder.recurring || 'none');
    const [notificationEnabled, setNotificationEnabled] = useState(reminder.notificationEnabled ?? true);
    const [notificationTime, setNotificationTime] = useState(reminder.notificationTime || 15);

    const handleSave = async () => {
        if (!title.trim()) return;
        await remindersService.update(reminder.id!, {
            title,
            description,
            dueDate: new Date(dueDate),
            dueTime,
            priority: priority as 'low' | 'medium' | 'high',
            category,
            recurring,
            notificationEnabled,
            notificationTime,
        });
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(e.target.value);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDueDate(e.target.value);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDueTime(e.target.value);
    };

    const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPriority(e.target.value as 'low' | 'medium' | 'high');
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCategory(e.target.value);
    };

    const handleRecurringChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setRecurring(e.target.value);
    };

    const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNotificationEnabled(e.target.checked);
    };

    const handleNotificationTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setNotificationTime(parseInt(e.target.value));
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-tertiary flex-shrink-0">
                <button onClick={toggleSidebar} title="Toggle sidebar" className="md:hidden p-2 rounded-md text-text-primary bg-secondary border border-tertiary">
                    <MenuIcon className="text-2xl" />
                </button>
                <div className="flex-1 flex items-center gap-3 ml-2">
                    <button
                        onClick={() => onToggleComplete(reminder)}
                        className={`p-2 rounded-md transition-colors ${reminder.status === 'completed' ? 'bg-accent/20 text-accent' : 'hover:bg-tertiary'}`}
                    >
                        <CheckCircleIcon className="text-2xl" />
                    </button>
                    <h2 className="text-xl font-semibold">{reminder.status === 'completed' ? '✓ Completed' : 'Reminder'}</h2>
                </div>
                <button onClick={() => onDelete(reminder)} className="p-2 rounded-md hover:bg-red-500/20 text-red-400">
                    <DeleteIcon className="text-2xl" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                    <input
                        type="text"
                        value={title}
                        onChange={handleTitleChange}
                        onBlur={handleSave}
                        className="w-full text-3xl font-bold bg-transparent text-text-primary focus:outline-none"
                        placeholder="Reminder title"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
                    <textarea
                        value={description}
                        onChange={handleDescriptionChange}
                        onBlur={handleSave}
                        className="w-full bg-primary border border-tertiary rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                        rows={4}
                        placeholder="Add details..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Due Date</label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={handleDateChange}
                            onBlur={handleSave}
                            className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Time</label>
                        <input
                            type="time"
                            value={dueTime}
                            onChange={handleTimeChange}
                            onBlur={handleSave}
                            className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Priority</label>
                        <select
                            value={priority}
                            onChange={handlePriorityChange}
                            onBlur={handleSave}
                            className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Category</label>
                        <select
                            value={category}
                            onChange={handleCategoryChange}
                            onBlur={handleSave}
                            className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                            <option value="personal">Personal</option>
                            <option value="work">Work</option>
                            <option value="health">Health</option>
                            <option value="finance">Finance</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Recurring</label>
                    <select
                        value={recurring}
                        onChange={handleRecurringChange}
                        onBlur={handleSave}
                        className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                        <option value="none">None</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>

                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={notificationEnabled}
                            onChange={handleNotificationChange}
                            onBlur={handleSave}
                            className="w-4 h-4 rounded border-tertiary"
                        />
                        <span className="text-sm font-medium text-text-primary">Enable Notification</span>
                    </label>
                    {notificationEnabled && (
                        <select
                            value={notificationTime}
                            onChange={handleNotificationTimeChange}
                            onBlur={handleSave}
                            className="bg-primary border border-tertiary rounded-lg px-3 py-1 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                            <option value={5}>5 min before</option>
                            <option value={15}>15 min before</option>
                            <option value={30}>30 min before</option>
                            <option value={60}>1 hour before</option>
                            <option value={1440}>1 day before</option>
                        </select>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reminders;

