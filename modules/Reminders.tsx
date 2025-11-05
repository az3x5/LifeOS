import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { Reminder } from '../types';
import ConfirmModal from '../components/modals/ConfirmModal';
import AlertModal from '../components/modals/AlertModal';

const TABS = ['All', 'Pending', 'Completed', 'Overdue'];

const PRIORITY_COLORS = {
    low: 'bg-blue-500/30 text-blue-200',
    medium: 'bg-yellow-500/30 text-yellow-200',
    high: 'bg-red-500/30 text-red-200',
};

const PRIORITY_ICONS = {
    low: '🔵',
    medium: '🟡',
    high: '🔴',
};

const CATEGORY_ICONS = {
    personal: '👤',
    work: '💼',
    health: '❤️',
    finance: '💰',
    other: '📌',
};

const Reminders: React.FC = () => {
    const [activeTab, setActiveTab] = useState(TABS[0]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null>(null);
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; icon?: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');

    const reminders = useLiveQuery(() => db.reminders.toArray());

    // Update overdue status
    useMemo(() => {
        if (!reminders) return;
        const now = new Date();
        reminders.forEach(async (reminder) => {
            if (reminder.status === 'pending' && new Date(reminder.dueDate) < now) {
                await db.reminders.update(reminder.id!, { status: 'overdue' });
            }
        });
    }, [reminders]);

    const filteredReminders = useMemo(() => {
        if (!reminders) return [];
        
        let filtered = reminders;

        // Filter by tab
        if (activeTab === 'Pending') {
            filtered = filtered.filter(r => r.status === 'pending');
        } else if (activeTab === 'Completed') {
            filtered = filtered.filter(r => r.status === 'completed');
        } else if (activeTab === 'Overdue') {
            filtered = filtered.filter(r => r.status === 'overdue');
        }

        // Filter by search
        if (searchQuery) {
            filtered = filtered.filter(r => 
                r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by category
        if (filterCategory !== 'all') {
            filtered = filtered.filter(r => r.category === filterCategory);
        }

        // Filter by priority
        if (filterPriority !== 'all') {
            filtered = filtered.filter(r => r.priority === filterPriority);
        }

        // Sort by due date
        return filtered.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [reminders, activeTab, searchQuery, filterCategory, filterPriority]);

    const stats = useMemo(() => {
        if (!reminders) return { total: 0, pending: 0, completed: 0, overdue: 0 };
        return {
            total: reminders.length,
            pending: reminders.filter(r => r.status === 'pending').length,
            completed: reminders.filter(r => r.status === 'completed').length,
            overdue: reminders.filter(r => r.status === 'overdue').length,
        };
    }, [reminders]);

    const handleAddReminder = () => {
        setEditingReminder(null);
        setShowAddModal(true);
    };

    const handleEditReminder = (reminder: Reminder) => {
        setEditingReminder(reminder);
        setShowAddModal(true);
    };

    const handleDeleteReminder = (reminder: Reminder) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Reminder',
            message: `Are you sure you want to delete "${reminder.title}"?`,
            icon: '🗑️',
            onConfirm: async () => {
                await db.reminders.delete(reminder.id!);
                setConfirmModal(null);
            }
        });
    };

    const handleCompleteReminder = async (reminder: Reminder) => {
        await db.reminders.update(reminder.id!, {
            status: 'completed',
            completedAt: new Date()
        });
    };

    const handleUncompleteReminder = async (reminder: Reminder) => {
        const now = new Date();
        const dueDate = new Date(reminder.dueDate);
        const status = dueDate < now ? 'overdue' : 'pending';
        
        await db.reminders.update(reminder.id!, {
            status,
            completedAt: undefined
        });
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Reminders</h1>
                    <p className="text-text-secondary mt-1">Manage your tasks and reminders</p>
                </div>
                <button
                    onClick={handleAddReminder}
                    className="bg-accent hover:bg-accent/80 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">add</span>
                    Add Reminder
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-secondary p-4 rounded-xl border border-tertiary">
                    <p className="text-text-secondary text-sm">Total</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
                </div>
                <div className="bg-secondary p-4 rounded-xl border border-tertiary">
                    <p className="text-text-secondary text-sm">Pending</p>
                    <p className="text-2xl font-bold text-blue-400">{stats.pending}</p>
                </div>
                <div className="bg-secondary p-4 rounded-xl border border-tertiary">
                    <p className="text-text-secondary text-sm">Overdue</p>
                    <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
                </div>
                <div className="bg-secondary p-4 rounded-xl border border-tertiary">
                    <p className="text-text-secondary text-sm">Completed</p>
                    <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-secondary p-4 rounded-xl border border-tertiary space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search reminders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
                    >
                        <option value="all">All Categories</option>
                        <option value="personal">Personal</option>
                        <option value="work">Work</option>
                        <option value="health">Health</option>
                        <option value="finance">Finance</option>
                        <option value="other">Other</option>
                    </select>
                    <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className="bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
                    >
                        <option value="all">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-tertiary">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeTab === tab
                                ? 'text-accent border-b-2 border-accent'
                                : 'text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Reminders List */}
            <div className="space-y-3">
                {filteredReminders.length === 0 ? (
                    <div className="bg-secondary p-12 rounded-xl border border-tertiary text-center">
                        <span className="material-symbols-outlined text-6xl text-text-muted mb-4">notifications_off</span>
                        <p className="text-text-muted text-lg">No reminders found</p>
                        <p className="text-text-secondary text-sm mt-2">Create your first reminder to get started</p>
                    </div>
                ) : (
                    filteredReminders.map(reminder => (
                        <ReminderCard
                            key={reminder.id}
                            reminder={reminder}
                            onEdit={handleEditReminder}
                            onDelete={handleDeleteReminder}
                            onComplete={handleCompleteReminder}
                            onUncomplete={handleUncompleteReminder}
                        />
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <ReminderModal
                    reminder={editingReminder}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingReminder(null);
                    }}
                    onSave={() => {
                        setShowAddModal(false);
                        setEditingReminder(null);
                        setAlertModal({
                            isOpen: true,
                            title: 'Success',
                            message: editingReminder ? 'Reminder updated successfully!' : 'Reminder created successfully!',
                            icon: '✅'
                        });
                    }}
                />
            )}

            {/* Confirm Modal */}
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

            {/* Alert Modal */}
            {alertModal && (
                <AlertModal
                    isOpen={alertModal.isOpen}
                    title={alertModal.title}
                    message={alertModal.message}
                    icon={alertModal.icon}
                    onClose={() => setAlertModal(null)}
                />
            )}
        </div>
    );
};

// --- REMINDER CARD COMPONENT ---

const ReminderCard: React.FC<{
    reminder: Reminder;
    onEdit: (reminder: Reminder) => void;
    onDelete: (reminder: Reminder) => void;
    onComplete: (reminder: Reminder) => void;
    onUncomplete: (reminder: Reminder) => void;
}> = ({ reminder, onEdit, onDelete, onComplete, onUncomplete }) => {
    const isCompleted = reminder.status === 'completed';
    const isOverdue = reminder.status === 'overdue';

    const dueDate = new Date(reminder.dueDate);
    const formattedDate = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = reminder.dueTime || '';

    return (
        <div className={`bg-secondary p-4 rounded-xl border transition-all ${
            isCompleted ? 'border-green-500/30 opacity-75' :
            isOverdue ? 'border-red-500/50' :
            'border-tertiary hover:border-accent/50'
        }`}>
            <div className="flex items-start gap-4">
                {/* Checkbox */}
                <button
                    onClick={() => isCompleted ? onUncomplete(reminder) : onComplete(reminder)}
                    className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isCompleted
                            ? 'bg-green-500 border-green-500'
                            : 'border-text-muted hover:border-accent'
                    }`}
                >
                    {isCompleted && <span className="material-symbols-outlined text-white text-sm">check</span>}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <h3 className={`text-lg font-semibold ${
                                isCompleted ? 'line-through text-text-muted' : 'text-text-primary'
                            }`}>
                                {reminder.title}
                            </h3>
                            {reminder.description && (
                                <p className="text-text-secondary text-sm mt-1">{reminder.description}</p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => onEdit(reminder)}
                                className="text-text-muted hover:text-accent transition-colors"
                                title="Edit"
                            >
                                <span className="material-symbols-outlined text-xl">edit</span>
                            </button>
                            <button
                                onClick={() => onDelete(reminder)}
                                className="text-text-muted hover:text-red-400 transition-colors"
                                title="Delete"
                            >
                                <span className="material-symbols-outlined text-xl">delete</span>
                            </button>
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORITY_COLORS[reminder.priority]}`}>
                            {PRIORITY_ICONS[reminder.priority]} {reminder.priority.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-tertiary text-text-secondary">
                            {CATEGORY_ICONS[reminder.category]} {reminder.category}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                            isOverdue ? 'bg-red-500/30 text-red-200' : 'bg-tertiary text-text-secondary'
                        }`}>
                            📅 {formattedDate} {formattedTime && `at ${formattedTime}`}
                        </span>
                        {reminder.recurring && reminder.recurring !== 'none' && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/30 text-purple-200">
                                🔄 {reminder.recurring}
                            </span>
                        )}
                        {reminder.tags && reminder.tags.length > 0 && (
                            reminder.tags.map(tag => (
                                <span key={tag} className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-300">
                                    #{tag}
                                </span>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- REMINDER MODAL COMPONENT ---

const ReminderModal: React.FC<{
    reminder: Reminder | null;
    onClose: () => void;
    onSave: () => void;
}> = ({ reminder, onClose, onSave }) => {
    const [title, setTitle] = useState(reminder?.title || '');
    const [description, setDescription] = useState(reminder?.description || '');
    const [dueDate, setDueDate] = useState(
        reminder?.dueDate ? new Date(reminder.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    );
    const [dueTime, setDueTime] = useState(reminder?.dueTime || '');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(reminder?.priority || 'medium');
    const [category, setCategory] = useState<'personal' | 'work' | 'health' | 'finance' | 'other'>(reminder?.category || 'personal');
    const [recurring, setRecurring] = useState<'none' | 'daily' | 'weekly' | 'monthly'>(reminder?.recurring || 'none');
    const [recurringDays, setRecurringDays] = useState<number[]>(reminder?.recurringDays || []);
    const [notificationEnabled, setNotificationEnabled] = useState(reminder?.notificationEnabled || false);
    const [notificationTime, setNotificationTime] = useState(reminder?.notificationTime || 15);
    const [tags, setTags] = useState(reminder?.tags?.join(', ') || '');

    const handleSave = async () => {
        if (!title.trim()) {
            alert('Please enter a title');
            return;
        }

        const reminderData: Partial<Reminder> = {
            title: title.trim(),
            description: description.trim() || undefined,
            dueDate: new Date(dueDate + 'T' + (dueTime || '00:00')),
            dueTime: dueTime || undefined,
            priority,
            category,
            status: 'pending',
            recurring,
            recurringDays: recurring === 'weekly' ? recurringDays : undefined,
            notificationEnabled,
            notificationTime: notificationEnabled ? notificationTime : undefined,
            tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : undefined,
        };

        if (reminder?.id) {
            await db.reminders.update(reminder.id, reminderData);
        } else {
            await db.reminders.add({
                ...reminderData,
                createdAt: new Date(),
            } as Reminder);
        }

        onSave();
    };

    const toggleRecurringDay = (day: number) => {
        setRecurringDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary border border-tertiary rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-text-primary">
                        {reminder ? 'Edit Reminder' : 'New Reminder'}
                    </h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary text-2xl">
                        &times;
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter reminder title"
                            className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter description (optional)"
                            rows={3}
                            className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
                        />
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Due Date *
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Due Time
                            </label>
                            <input
                                type="time"
                                value={dueTime}
                                onChange={(e) => setDueTime(e.target.value)}
                                className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
                            />
                        </div>
                    </div>

                    {/* Priority and Category */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Priority
                            </label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as any)}
                                className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
                            >
                                <option value="low">🔵 Low</option>
                                <option value="medium">🟡 Medium</option>
                                <option value="high">🔴 High</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Category
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as any)}
                                className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
                            >
                                <option value="personal">👤 Personal</option>
                                <option value="work">💼 Work</option>
                                <option value="health">❤️ Health</option>
                                <option value="finance">💰 Finance</option>
                                <option value="other">📌 Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Recurring */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Recurring
                        </label>
                        <select
                            value={recurring}
                            onChange={(e) => setRecurring(e.target.value as any)}
                            className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
                        >
                            <option value="none">None</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>

                    {/* Recurring Days (for weekly) */}
                    {recurring === 'weekly' && (
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Repeat on
                            </label>
                            <div className="flex gap-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => toggleRecurringDay(idx)}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            recurringDays.includes(idx)
                                                ? 'bg-accent text-white'
                                                : 'bg-primary text-text-secondary hover:bg-tertiary'
                                        }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notification */}
                    <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notificationEnabled}
                                onChange={(e) => setNotificationEnabled(e.target.checked)}
                                className="w-5 h-5 rounded border-tertiary text-accent focus:ring-accent"
                            />
                            <span className="text-sm font-medium text-text-secondary">
                                Enable notification
                            </span>
                        </label>
                        {notificationEnabled && (
                            <div className="mt-2">
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Notify me (minutes before)
                                </label>
                                <input
                                    type="number"
                                    value={notificationTime}
                                    onChange={(e) => setNotificationTime(parseInt(e.target.value) || 0)}
                                    min="0"
                                    className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
                                />
                            </div>
                        )}
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Tags (comma-separated)
                        </label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="work, urgent, meeting"
                            className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-accent hover:bg-accent/80 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                        {reminder ? 'Update' : 'Create'} Reminder
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-lg font-medium bg-tertiary text-text-secondary hover:bg-tertiary/80 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Reminders;

