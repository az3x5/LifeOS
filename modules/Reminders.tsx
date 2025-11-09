import React, { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { Reminder } from '../types';
import { remindersService } from '../services/dataService';
import ConfirmModal from '../components/modals/ConfirmModal';

type ReminderFilter = 'all' | 'pending' | 'completed' | 'overdue';
type ReminderSort = 'dueDate' | 'priority' | 'created';
type ViewMode = 'list' | 'grid' | 'kanban';

// --- ICONS ---
const MenuIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>menu</span>;
const BellIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>notifications</span>;
const CheckCircleIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>check_circle</span>;
const ClockIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>schedule</span>;
const AlertIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>error</span>;
const MoreVertIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>more_vert</span>;
const DeleteIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>delete</span>;
const AddIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>add</span>;
const ViewListIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>view_list</span>;
const ViewAgendaIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>view_agenda</span>;
const ViewWeekIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>view_week</span>;

const Reminders: React.FC = () => {
    const reminders = useSupabaseQuery<Reminder>('reminders');
    const [reminderFilter, setReminderFilter] = useState<ReminderFilter>('all');
    const [reminderSort, setReminderSort] = useState<ReminderSort>('dueDate');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
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

    const filteredReminders = useMemo(() => {
        let tempReminders = reminders ?? [];

        switch (reminderFilter) {
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

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            tempReminders = tempReminders.filter(r =>
                r.title.toLowerCase().includes(q) ||
                r.description?.toLowerCase().includes(q)
            );
        }

        // Sort
        tempReminders.sort((a, b) => {
            switch (reminderSort) {
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
    }, [reminders, reminderFilter, reminderSort, searchQuery]);

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
    };

    const handleDeleteReminder = async (reminder: Reminder) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Reminder',
            message: `Are you sure you want to delete "${reminder.title}"?`,
            icon: '🗑️',
            onConfirm: async () => {
                await remindersService.delete(reminder.id!);
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
            <FilterSidebar
                reminderFilter={reminderFilter}
                setReminderFilter={setReminderFilter}
                reminderSort={reminderSort}
                setReminderSort={setReminderSort}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
            />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-tertiary flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsSidebarOpen(true)} title="Toggle filters" className="md:hidden p-2 rounded-md text-text-primary bg-secondary border border-tertiary">
                            <MenuIcon className="text-2xl" />
                        </button>
                        <h1 className="text-2xl font-bold">Reminders</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleNewReminder} title="New Reminder" className="p-2 rounded-md hover:bg-tertiary text-accent">
                            <AddIcon className="text-2xl" />
                        </button>
                        <div className="flex gap-1 bg-secondary rounded-lg p-1">
                            <button onClick={() => setViewMode('list')} title="List View" className={`p-2 rounded ${viewMode === 'list' ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:text-text-primary'}`}>
                                <ViewListIcon className="text-xl" />
                            </button>
                            <button onClick={() => setViewMode('grid')} title="Grid View" className={`p-2 rounded ${viewMode === 'grid' ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:text-text-primary'}`}>
                                <ViewAgendaIcon className="text-xl" />
                            </button>
                            <button onClick={() => setViewMode('kanban')} title="Kanban View" className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:text-text-primary'}`}>
                                <ViewWeekIcon className="text-xl" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    {filteredReminders.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-text-muted">
                            <div className="text-center">
                                <BellIcon className="text-6xl mx-auto text-tertiary mb-4" />
                                <h2 className="text-xl font-semibold">No reminders found</h2>
                                <p>Create a new reminder to get started</p>
                            </div>
                        </div>
                    ) : viewMode === 'list' ? (
                        <ListView reminders={filteredReminders} onDelete={handleDeleteReminder} onToggleComplete={handleToggleComplete} />
                    ) : viewMode === 'grid' ? (
                        <GridView reminders={filteredReminders} onDelete={handleDeleteReminder} onToggleComplete={handleToggleComplete} />
                    ) : (
                        <KanbanView reminders={filteredReminders} onDelete={handleDeleteReminder} onToggleComplete={handleToggleComplete} />
                    )}
                </div>
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

const FilterSidebar: React.FC<{
    reminderFilter: ReminderFilter;
    setReminderFilter: (f: ReminderFilter) => void;
    reminderSort: ReminderSort;
    setReminderSort: (s: ReminderSort) => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (open: boolean) => void;
}> = (props) => {
    return (
        <div className={`w-72 md:w-80 bg-secondary border-r border-tertiary flex flex-col transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 fixed inset-y-0 left-0 z-30 ${props.isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-4 flex-shrink-0 space-y-4 border-b border-tertiary">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Filters</h2>
                    <button onClick={() => props.setIsSidebarOpen(false)} className="md:hidden p-1 hover:bg-tertiary rounded">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <input
                    type="text"
                    placeholder="Search reminders..."
                    value={props.searchQuery}
                    onChange={e => props.setSearchQuery(e.target.value)}
                    className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
            </div>

            <div className="px-4 py-3 space-y-2 border-b border-tertiary">
                <p className="text-xs font-semibold text-text-secondary uppercase">Status</p>
                <NavItem icon={<BellIcon className="text-lg" />} label="All" isActive={props.reminderFilter === 'all'} onClick={() => props.setReminderFilter('all')} />
                <NavItem icon={<ClockIcon className="text-lg" />} label="Pending" isActive={props.reminderFilter === 'pending'} onClick={() => props.setReminderFilter('pending')} />
                <NavItem icon={<CheckCircleIcon className="text-lg" />} label="Completed" isActive={props.reminderFilter === 'completed'} onClick={() => props.setReminderFilter('completed')} />
                <NavItem icon={<AlertIcon className="text-lg" />} label="Overdue" isActive={props.reminderFilter === 'overdue'} onClick={() => props.setReminderFilter('overdue')} />
            </div>

            <div className="px-4 py-3 border-b border-tertiary">
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">Sort by</label>
                <select
                    value={props.reminderSort}
                    onChange={e => props.setReminderSort(e.target.value as ReminderSort)}
                    className="w-full bg-primary border border-tertiary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                >
                    <option value="dueDate">Due Date</option>
                    <option value="priority">Priority</option>
                    <option value="created">Created</option>
                </select>
            </div>
        </div>
    );
};

const ListView: React.FC<{
    reminders: Reminder[];
    onDelete: (reminder: Reminder) => void;
    onToggleComplete: (reminder: Reminder) => void;
}> = ({ reminders, onDelete, onToggleComplete }) => {
    return (
        <div className="space-y-2">
            {reminders.map(reminder => (
                <ReminderCard key={reminder.id} reminder={reminder} onDelete={onDelete} onToggleComplete={onToggleComplete} />
            ))}
        </div>
    );
};

const GridView: React.FC<{
    reminders: Reminder[];
    onDelete: (reminder: Reminder) => void;
    onToggleComplete: (reminder: Reminder) => void;
}> = ({ reminders, onDelete, onToggleComplete }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reminders.map(reminder => (
                <ReminderCard key={reminder.id} reminder={reminder} onDelete={onDelete} onToggleComplete={onToggleComplete} />
            ))}
        </div>
    );
};

const KanbanView: React.FC<{
    reminders: Reminder[];
    onDelete: (reminder: Reminder) => void;
    onToggleComplete: (reminder: Reminder) => void;
}> = ({ reminders, onDelete, onToggleComplete }) => {
    const pending = reminders.filter(r => r.status === 'pending');
    const overdue = reminders.filter(r => r.status === 'overdue');
    const completed = reminders.filter(r => r.status === 'completed');

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            <KanbanColumn title="Pending" reminders={pending} onDelete={onDelete} onToggleComplete={onToggleComplete} />
            <KanbanColumn title="Overdue" reminders={overdue} onDelete={onDelete} onToggleComplete={onToggleComplete} />
            <KanbanColumn title="Completed" reminders={completed} onDelete={onDelete} onToggleComplete={onToggleComplete} />
        </div>
    );
};

const KanbanColumn: React.FC<{
    title: string;
    reminders: Reminder[];
    onDelete: (reminder: Reminder) => void;
    onToggleComplete: (reminder: Reminder) => void;
}> = ({ title, reminders, onDelete, onToggleComplete }) => {
    return (
        <div className="bg-secondary rounded-lg border border-tertiary p-4 flex flex-col">
            <h3 className="font-semibold mb-4 text-text-primary">{title} ({reminders.length})</h3>
            <div className="flex-1 space-y-2 overflow-y-auto">
                {reminders.length === 0 ? (
                    <div className="text-center text-text-muted py-8">
                        <p className="text-sm">No reminders</p>
                    </div>
                ) : (
                    reminders.map(reminder => (
                        <ReminderCard key={reminder.id} reminder={reminder} onDelete={onDelete} onToggleComplete={onToggleComplete} compact />
                    ))
                )}
            </div>
        </div>
    );
};

const ReminderCard: React.FC<{
    reminder: Reminder;
    onDelete: (reminder: Reminder) => void;
    onToggleComplete: (reminder: Reminder) => void;
    compact?: boolean;
}> = ({ reminder, onDelete, onToggleComplete, compact }) => {
    const [showMenu, setShowMenu] = useState(false);
    const priorityColors = { high: 'bg-red-500/20 text-red-400', medium: 'bg-yellow-500/20 text-yellow-400', low: 'bg-green-500/20 text-green-400' };
    const statusColors = { pending: 'bg-blue-500/20 text-blue-400', overdue: 'bg-red-500/20 text-red-400', completed: 'bg-green-500/20 text-green-400' };

    return (
        <div className={`bg-primary border border-tertiary rounded-lg p-3 hover:border-accent/50 transition-colors ${compact ? '' : ''}`}>
            <div className="flex items-start gap-3">
                <button
                    onClick={() => onToggleComplete(reminder)}
                    className={`flex-shrink-0 mt-1 ${reminder.status === 'completed' ? 'text-accent' : 'text-tertiary hover:text-accent'}`}
                >
                    <CheckCircleIcon className="text-xl" />
                </button>
                <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold ${reminder.status === 'completed' ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                        {reminder.title}
                    </h3>
                    {!compact && reminder.description && (
                        <p className="text-sm text-text-secondary mt-1 line-clamp-2">{reminder.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${priorityColors[reminder.priority as keyof typeof priorityColors]}`}>
                            {reminder.priority}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${statusColors[reminder.status as keyof typeof statusColors]}`}>
                            {reminder.status}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-tertiary text-text-secondary">
                            {new Date(reminder.dueDate).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <div className="relative flex-shrink-0">
                    <button onClick={() => setShowMenu(!showMenu)} className="p-1 hover:bg-tertiary rounded">
                        <MoreVertIcon className="text-lg" />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-secondary border border-tertiary rounded-lg shadow-lg z-50">
                            <button onClick={() => { onDelete(reminder); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-tertiary flex items-center gap-2 text-red-400">
                                <DeleteIcon className="text-lg" /> Delete
                            </button>
                        </div>
                    )}
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

export default Reminders;

