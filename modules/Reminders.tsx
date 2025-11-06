import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { triggerAutoSync } from '../services/syncService';
import { Reminder } from '../types';
import ConfirmModal from '../components/modals/ConfirmModal';
import AlertModal from '../components/modals/AlertModal';

// Category icons and colors
const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
    personal: { icon: '📍', color: 'bg-teal-500/20 text-teal-400' },
    work: { icon: '💼', color: 'bg-blue-500/20 text-blue-400' },
    health: { icon: '❤️', color: 'bg-red-500/20 text-red-400' },
    finance: { icon: '💰', color: 'bg-yellow-500/20 text-yellow-400' },
    shopping: { icon: '🛒', color: 'bg-purple-500/20 text-purple-400' },
    other: { icon: '📌', color: 'bg-gray-500/20 text-gray-400' },
};

type ViewType = 'myDay' | 'important' | 'planned' | 'all' | 'completed';

const Reminders: React.FC = () => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null>(null);
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; icon?: string } | null>(null);

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

    // Calculate stats
    const stats = useMemo(() => {
        if (!reminders) return { today: 0, scheduled: 0, important: 0, place: 0, noAlert: 0, completed: 0 };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return {
            today: reminders.filter(r => {
                const dueDate = new Date(r.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate.getTime() === today.getTime() && r.status !== 'completed';
            }).length,
            scheduled: reminders.filter(r => new Date(r.dueDate) > new Date() && r.status !== 'completed').length,
            important: reminders.filter(r => r.priority === 'high' && r.status !== 'completed').length,
            place: reminders.filter(r => r.category === 'shopping' && r.status !== 'completed').length,
            noAlert: reminders.filter(r => !r.dueDate && r.status !== 'completed').length,
            completed: reminders.filter(r => r.status === 'completed').length,
        };
    }, [reminders]);

    // Get all active reminders for "Try these out" section
    const allReminders = useMemo(() => {
        if (!reminders) return [];
        return reminders.filter(r => r.status !== 'completed').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [reminders]);

    const handleDeleteReminder = (reminder: Reminder) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Reminder',
            message: `Are you sure you want to delete "${reminder.title}"?`,
            icon: '🗑️',
            onConfirm: async () => {
                await db.reminders.delete(reminder.id!);
                triggerAutoSync();
                setConfirmModal(null);
            }
        });
    };

    const handleCompleteReminder = async (reminder: Reminder) => {
        await db.reminders.update(reminder.id!, {
            status: 'completed',
            completedAt: new Date()
        });
        triggerAutoSync();
    };

    const handleUncompleteReminder = async (reminder: Reminder) => {
        const now = new Date();
        const dueDate = new Date(reminder.dueDate);
        const status = dueDate < now ? 'overdue' : 'pending';

        await db.reminders.update(reminder.id!, {
            status,
            completedAt: undefined
        });
        triggerAutoSync();
    };

    return (
        <div className="flex flex-col h-screen bg-primary overflow-hidden">
            {/* Header */}
            <div className="bg-secondary border-b border-tertiary px-4 md:px-6 py-4 flex justify-between items-center flex-shrink-0">
                <h1 className="text-2xl font-bold text-text-primary">Reminder</h1>
                <button className="p-2 hover:bg-tertiary rounded-lg transition-colors">
                    <span className="material-symbols-outlined">more_vert</span>
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="px-4 md:px-6 py-6 space-y-6">
                    {/* Stats Grid - 3x2 */}
                    <div className="grid grid-cols-3 gap-3 md:gap-4">
                        {/* Today */}
                        <div className="bg-secondary border border-tertiary rounded-lg p-4 text-center hover:border-accent/50 transition-colors cursor-pointer">
                            <div className="text-3xl mb-2">📅</div>
                            <p className="text-text-secondary text-xs md:text-sm">Today</p>
                            <p className="text-xl md:text-2xl font-bold text-text-primary">{stats.today}</p>
                        </div>

                        {/* Scheduled */}
                        <div className="bg-secondary border border-tertiary rounded-lg p-4 text-center hover:border-accent/50 transition-colors cursor-pointer">
                            <div className="text-3xl mb-2">🕐</div>
                            <p className="text-text-secondary text-xs md:text-sm">Scheduled</p>
                            <p className="text-xl md:text-2xl font-bold text-text-primary">{stats.scheduled}</p>
                        </div>

                        {/* Important */}
                        <div className="bg-secondary border border-tertiary rounded-lg p-4 text-center hover:border-accent/50 transition-colors cursor-pointer">
                            <div className="text-3xl mb-2">⭐</div>
                            <p className="text-text-secondary text-xs md:text-sm">Important</p>
                            <p className="text-xl md:text-2xl font-bold text-text-primary">{stats.important}</p>
                        </div>

                        {/* Place */}
                        <div className="bg-secondary border border-tertiary rounded-lg p-4 text-center hover:border-accent/50 transition-colors cursor-pointer">
                            <div className="text-3xl mb-2">📍</div>
                            <p className="text-text-secondary text-xs md:text-sm">Place</p>
                            <p className="text-xl md:text-2xl font-bold text-text-primary">{stats.place}</p>
                        </div>

                        {/* No Alert */}
                        <div className="bg-secondary border border-tertiary rounded-lg p-4 text-center hover:border-accent/50 transition-colors cursor-pointer">
                            <div className="text-3xl mb-2">🔕</div>
                            <p className="text-text-secondary text-xs md:text-sm">No alert</p>
                            <p className="text-xl md:text-2xl font-bold text-text-primary">{stats.noAlert}</p>
                        </div>

                        {/* Completed */}
                        <div className="bg-secondary border border-tertiary rounded-lg p-4 text-center hover:border-accent/50 transition-colors cursor-pointer">
                            <div className="text-3xl mb-2">✅</div>
                            <p className="text-text-secondary text-xs md:text-sm">Completed</p>
                            <p className="text-xl md:text-2xl font-bold text-text-primary">{stats.completed}</p>
                        </div>
                    </div>

                    {/* Try these out section */}
                    {allReminders.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-text-primary mb-4">Try these out</h2>
                            <div className="space-y-3">
                                {allReminders.map(reminder => (
                                    <ReminderCard
                                        key={reminder.id}
                                        reminder={reminder}
                                        onEdit={() => {
                                            setEditingReminder(reminder);
                                            setShowAddModal(true);
                                        }}
                                        onDelete={() => handleDeleteReminder(reminder)}
                                        onComplete={() => handleCompleteReminder(reminder)}
                                        onUncomplete={() => handleUncompleteReminder(reminder)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {allReminders.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <span className="text-5xl mb-4">📝</span>
                            <p className="text-text-muted text-lg">No reminders yet</p>
                            <p className="text-text-secondary text-sm mt-2">Create your first reminder to get started</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Add Button */}
            <div className="bg-secondary border-t border-tertiary px-4 md:px-6 py-4 flex-shrink-0">
                <button
                    onClick={() => {
                        setEditingReminder(null);
                        setShowAddModal(true);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-primary border border-tertiary rounded-lg hover:border-accent/50 transition-colors text-text-secondary hover:text-text-primary"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-xl">+</span>
                        <span>Add reminder</span>
                    </div>
                    <span className="material-symbols-outlined">mic</span>
                </button>
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
    onEdit: () => void;
    onDelete: () => void;
    onComplete: () => void;
    onUncomplete: () => void;
}> = ({ reminder, onEdit, onDelete, onComplete, onUncomplete }) => {
    const isCompleted = reminder.status === 'completed';
    const categoryInfo = CATEGORY_ICONS[reminder.category] || CATEGORY_ICONS.other;

    // Check if reminder has sub-items (for list-type reminders)
    const hasSubItems = reminder.description && reminder.description.includes('\n');
    const subItems = hasSubItems ? reminder.description?.split('\n').filter(item => item.trim()) : [];

    return (
        <div className={`bg-secondary border border-tertiary rounded-lg p-4 hover:border-accent/50 transition-all group ${
            isCompleted ? 'opacity-60' : ''
        }`}>
            <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                    onClick={() => isCompleted ? onUncomplete() : onComplete()}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 ${
                        isCompleted
                            ? 'bg-accent border-accent'
                            : 'border-text-muted hover:border-accent'
                    }`}
                >
                    {isCompleted && <span className="material-symbols-outlined text-white text-sm">check</span>}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm md:text-base ${
                        isCompleted ? 'line-through text-text-muted' : 'text-text-primary'
                    }`}>
                        {reminder.title}
                    </h3>
                    {reminder.description && !hasSubItems && (
                        <p className="text-text-secondary text-xs md:text-sm mt-1">{reminder.description}</p>
                    )}

                    {/* Sub-items for list reminders */}
                    {hasSubItems && subItems && (
                        <div className="mt-2 space-y-1">
                            {subItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs md:text-sm text-text-secondary">
                                    <span className="w-4 h-4 rounded-full border border-text-muted flex-shrink-0"></span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Category Icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg ${categoryInfo.color}`}>
                    {categoryInfo.icon}
                </div>
            </div>

            {/* Actions (visible on hover) */}
            <div className="hidden group-hover:flex gap-2 mt-3 pt-3 border-t border-tertiary/50">
                <button
                    onClick={onEdit}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-accent bg-primary hover:bg-primary/80 rounded transition-colors"
                >
                    Edit
                </button>
                <button
                    onClick={onDelete}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-red-400 bg-primary hover:bg-primary/80 rounded transition-colors"
                >
                    Delete
                </button>
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

        triggerAutoSync();
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

