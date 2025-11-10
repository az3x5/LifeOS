import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { Habit, HabitLog, HabitFolder } from '../types';
import { habitsService, habitLogsService, habitFoldersService } from '../services/dataService';
import { calculateStreaks } from '../utils/habits';
import ConfirmModal from '../components/modals/ConfirmModal';
import AlertModal from '../components/modals/AlertModal';

type HabitFilter = 'all' | 'active' | 'paused' | 'archived';
type ViewMode = 'list' | 'detail';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

type Toast = { id: number; icon: string; title: string; message: string; };
type UndoAction = { message: string; onUndo: () => void; };

// --- ICONS ---
const MenuIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>menu</span>;
const AddIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>add</span>;
const FolderIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>folder</span>;
const FolderPlusIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>create_new_folder</span>;
const ChevronRightIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>chevron_right</span>;
const FireIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>local_fire_department</span>;
const DeleteIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>delete</span>;
const EditIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>edit</span>;
const PauseIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>pause</span>;
const PlayIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>play_arrow</span>;
const CloseIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>close</span>;
const CheckCircleIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>check_circle</span>;
const PencilIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>note_add</span>;
const TrashIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>delete</span>;
const ArrowBackIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>arrow_back</span>;
const TrendingUpIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>trending_up</span>;

const HabitTracker: React.FC = () => {
    const allHabits = useSupabaseQuery<Habit>('habits');
    const habitFolders = useSupabaseQuery<HabitFolder>('habit_folders');
    const habitLogs = useSupabaseQuery<HabitLog>('habit_logs');

    const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
    const [habitFilter, setHabitFilter] = useState<HabitFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null>(null);
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; icon?: string } | null>(null);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
    const undoTimeoutRef = useRef<number | null>(null);

    const streaks = useMemo(() => calculateStreaks(allHabits ?? [], habitLogs ?? []), [allHabits, habitLogs]);

    const selectedHabit = useMemo(() => {
        const habit = allHabits?.find(h => h.id === selectedHabitId);
        if (habit) return habit;
        if (selectedHabitId) setSelectedHabitId(null);
        return null;
    }, [allHabits, selectedHabitId]);

    const addToast = (toast: Omit<Toast, 'id'>) => {
        const newToast = { ...toast, id: Date.now() };
        setToasts(prev => [...prev, newToast]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== newToast.id)), 5000);
    };

    const handleNewHabit = async (folderId?: number) => {
        const newHabit: Habit = {
            name: 'Untitled Habit',
            frequency: 'daily',
            xp: 10,
            isFrozen: false,
            origin: 'user',
            createdAt: new Date(),
            folderId: folderId || null,
        };
        setEditingHabit(newHabit);
        setIsEditModalOpen(true);
    };

    const handleSelectHabit = (id: number | null) => {
        setSelectedHabitId(id);
        setViewMode('detail');
        setIsSidebarOpen(false);
    };

    const handleSaveHabit = async (habit: Habit) => {
        try {
            if (habit.id) {
                await habitsService.update(habit.id, habit);
                addToast({ icon: 'check_circle', title: 'Habit Updated', message: `"${habit.name}" has been updated.` });
            } else {
                const newHabit = await habitsService.create(habit);
                if (newHabit && newHabit.id) {
                    handleSelectHabit(newHabit.id);
                    addToast({ icon: 'check_circle', title: 'Habit Created', message: `"${habit.name}" has been created.` });
                }
            }
            setIsEditModalOpen(false);
            setEditingHabit(null);
        } catch (error) {
            setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to save habit.', icon: 'error' });
        }
    };

    const handleDeleteHabit = async (habitId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Habit',
            message: 'Are you sure you want to delete this habit? This action cannot be undone.',
            icon: 'warning',
            onConfirm: async () => {
                try {
                    await habitsService.delete(habitId);
                    handleSelectHabit(null);
                    setViewMode('list');
                    addToast({ icon: 'check_circle', title: 'Habit Deleted', message: 'Habit has been deleted.' });
                } catch (error) {
                    setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to delete habit.', icon: 'error' });
                }
            },
        });
    };

    const handleToggleHabit = useCallback(async (habit: Habit, date: string) => {
        if (habit.origin === 'system-islamic') {
            addToast({ icon: 'sync_lock', title: 'System Habit', message: `"${habit.name}" is managed automatically by the Islamic Knowledge module.` });
            return;
        }
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        setUndoAction(null);

        const log = habitLogs?.find(l => l.habitId === habit.id! && l.date === date);

        if (log) {
            await habitLogsService.delete(log.id!);
            const undoFunc = async () => { await habitLogsService.create({ habitId: habit.id!, date, completed: true }); };
            setUndoAction({ message: `"${habit.name}" marked incomplete.`, onUndo: undoFunc });
        } else {
            const newLog = await habitLogsService.create({ habitId: habit.id!, date, completed: true });
            const undoFunc = async () => { if (newLog && newLog.id) await habitLogsService.delete(newLog.id); };
            setUndoAction({ message: `"${habit.name}" completed!`, onUndo: undoFunc });
        }

        undoTimeoutRef.current = window.setTimeout(() => setUndoAction(null), 6000);
    }, [habitLogs, addToast]);

    return (
        <div className="flex h-full bg-primary font-sans relative overflow-hidden">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* Sidebar - Hidden on mobile, visible on desktop */}
            <div className={`fixed lg:static inset-y-0 left-0 z-30 lg:z-0 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <Sidebar
                    habitFolders={habitFolders}
                    habits={allHabits}
                    habitFilter={habitFilter}
                    setHabitFilter={setHabitFilter}
                    selectedHabitId={selectedHabitId}
                    setSelectedHabitId={handleSelectHabit}
                    onNewHabit={handleNewHabit}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    setConfirmModal={setConfirmModal}
                    setAlertModal={setAlertModal}
                    streaks={streaks}
                />
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {viewMode === 'detail' && selectedHabit ? (
                    <HabitDetailPanel
                        key={selectedHabit.id}
                        habit={selectedHabit}
                        habitLogs={habitLogs ?? []}
                        streaks={streaks}
                        onBack={() => setViewMode('list')}
                        onEdit={() => {
                            setEditingHabit(selectedHabit);
                            setIsEditModalOpen(true);
                        }}
                        onDelete={() => handleDeleteHabit(selectedHabit.id!)}
                        onToggle={handleToggleHabit}
                    />
                ) : (
                    <HabitListView
                        habits={allHabits}
                        habitLogs={habitLogs}
                        streaks={streaks}
                        onSelectHabit={handleSelectHabit}
                        onToggleSidebar={() => setIsSidebarOpen(p => !p)}
                        onNewHabit={handleNewHabit}
                    />
                )}
            </main>

            {/* Modals */}
            {isEditModalOpen && editingHabit && (
                <HabitEditModal
                    habit={editingHabit}
                    onSave={handleSaveHabit}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingHabit(null);
                    }}
                />
            )}
            {confirmModal && (
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmText="Delete"
                    icon={confirmModal.icon}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}
            {alertModal && (
                <AlertModal
                    isOpen={alertModal.isOpen}
                    title={alertModal.title}
                    message={alertModal.message}
                    icon={alertModal.icon}
                    onClose={() => setAlertModal(null)}
                />
            )}
            <ToastContainer toasts={toasts} setToasts={setToasts} />
            {undoAction && <UndoSnackbar message={undoAction.message} onUndo={() => { undoAction.onUndo(); setUndoAction(null); }} onDismiss={() => setUndoAction(null)} />}
        </div>
    );
};

// ============ HABIT LIST VIEW (Mobile/Responsive) ============

interface HabitListViewProps {
    habits: Habit[] | null;
    habitLogs: HabitLog[] | null;
    streaks: Record<number, { currentStreak: number; longestStreak: number }>;
    onSelectHabit: (id: number) => void;
    onToggleSidebar: () => void;
    onNewHabit: () => void;
}

const HabitListView: React.FC<HabitListViewProps> = (props) => {
    const todayStr = getTodayDateString();
    const todaysHabits = useMemo(() => {
        if (!props.habits) return [];
        const todayDay = new Date().getDay();
        return props.habits.filter(h => h.isActive !== false && (h.frequency === 'daily' || h.daysOfWeek?.includes(todayDay)));
    }, [props.habits]);

    const completedToday = useMemo(() => {
        if (!props.habitLogs) return new Set();
        return new Set(props.habitLogs.filter(l => l.date === todayStr).map(l => l.habitId));
    }, [props.habitLogs, todayStr]);

    const completionRate = useMemo(() => {
        if (todaysHabits.length === 0) return 0;
        return Math.round((completedToday.size / todaysHabits.length) * 100);
    }, [todaysHabits, completedToday]);

    return (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 p-3 sm:p-4 border-b border-tertiary">
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                    <button onClick={props.onToggleSidebar} className="lg:hidden p-2 rounded-md hover:bg-secondary flex-shrink-0">
                        <MenuIcon className="text-xl sm:text-2xl" />
                    </button>
                    <h1 className="text-xl sm:text-2xl font-bold flex-1">Today's Habits</h1>
                    <button onClick={props.onNewHabit} className="p-2 rounded-md hover:bg-secondary text-accent flex-shrink-0">
                        <AddIcon className="text-xl sm:text-2xl" />
                    </button>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                    <span className="text-text-muted">{completedToday.size} of {todaysHabits.length} completed</span>
                    <div className="text-base sm:text-lg font-bold text-accent">{completionRate}%</div>
                </div>
                <div className="w-full bg-primary rounded-full h-2 mt-2 overflow-hidden">
                    <div className="bg-accent h-full transition-all duration-300" style={{ width: `${completionRate}%` }} />
                </div>
            </div>

            {/* Habits List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3">
                {!props.habits ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted">
                        <div className="animate-pulse mb-3">
                            <FireIcon className="text-4xl sm:text-5xl opacity-50" />
                        </div>
                        <p className="text-center text-sm sm:text-base">Loading habits...</p>
                    </div>
                ) : todaysHabits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted">
                        <FireIcon className="text-4xl sm:text-5xl mb-3 opacity-50" />
                        <p className="text-center text-sm sm:text-base px-4">No habits for today. Create one to get started!</p>
                    </div>
                ) : (
                    todaysHabits.map((habit) => (
                        <HabitCard
                            key={habit.id}
                            habit={habit}
                            isCompleted={completedToday.has(habit.id!)}
                            streak={props.streaks[habit.id!]?.currentStreak ?? 0}
                            onClick={() => props.onSelectHabit(habit.id!)}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

// ============ HABIT CARD COMPONENT ============

interface HabitCardProps {
    habit: Habit;
    isCompleted: boolean;
    streak: number;
    onClick: () => void;
}

const HabitCard: React.FC<HabitCardProps> = (props) => {
    return (
        <button
            onClick={props.onClick}
            className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left active:scale-95 ${
                props.isCompleted
                    ? 'bg-green-500/10 border-green-500/50 shadow-md'
                    : 'bg-secondary border-tertiary hover:border-accent hover:shadow-md active:bg-tertiary'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg truncate">{props.habit.name}</h3>
                    {props.habit.description && <p className="text-xs sm:text-sm text-text-muted mt-1 line-clamp-2">{props.habit.description}</p>}
                    {props.streak > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs sm:text-sm text-orange-500 animate-pulse">
                            <FireIcon className="text-sm" />
                            <span>{props.streak} day streak</span>
                        </div>
                    )}
                </div>
                <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    props.isCompleted
                        ? 'bg-green-500 border-green-500 scale-110'
                        : 'border-tertiary'
                }`}>
                    {props.isCompleted && <CheckCircleIcon className="text-white text-lg" />}
                </div>
            </div>
        </button>
    );
};

// ============ SIDEBAR COMPONENT ============

interface SidebarProps {
    habitFolders: HabitFolder[] | null;
    habits: Habit[] | null;
    habitFilter: HabitFilter;
    setHabitFilter: (filter: HabitFilter) => void;
    selectedHabitId: number | null;
    setSelectedHabitId: (id: number | null) => void;
    onNewHabit: (folderId?: number) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    setConfirmModal: (modal: any) => void;
    setAlertModal: (modal: any) => void;
    streaks: Record<number, { currentStreak: number; longestStreak: number }>;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
    const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
    const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderInputValue, setNewFolderInputValue] = useState('');

    const isFilterActive = props.searchQuery.length > 0 || props.habitFilter !== 'all';

    const handleCreateFolder = async () => {
        if (!newFolderInputValue.trim()) return;
        try {
            await habitFoldersService.create({ name: newFolderInputValue });
            setNewFolderInputValue('');
            setIsCreatingFolder(false);
        } catch (error) {
            props.setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to create folder.', icon: 'error' });
        }
    };

    const filteredHabits = useMemo(() => {
        let result = props.habits ?? [];

        if (props.habitFilter === 'active') {
            result = result.filter(h => h.isActive !== false);
        } else if (props.habitFilter === 'paused') {
            result = result.filter(h => h.isActive === false);
        } else if (props.habitFilter === 'archived') {
            result = result.filter(h => h.isFrozen === true);
        }

        if (props.searchQuery) {
            result = result.filter(h => h.name.toLowerCase().includes(props.searchQuery.toLowerCase()));
        }

        return result;
    }, [props.habits, props.habitFilter, props.searchQuery]);

    const handleToggleFolder = (folderId: number) => {
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderId)) {
                newSet.delete(folderId);
            } else {
                newSet.add(folderId);
            }
            return newSet;
        });
    };

    const handleRenameFolder = async (folderId: number, newName: string) => {
        if (!newName.trim()) return;
        try {
            await habitFoldersService.update(folderId, { name: newName });
            setRenamingFolderId(null);
            setNewFolderName('');
        } catch (error) {
            props.setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to rename folder.', icon: 'error' });
        }
    };

    const handleDeleteFolder = (folderId: number) => {
        props.setConfirmModal({
            isOpen: true,
            title: 'Delete Folder',
            message: 'Are you sure you want to delete this folder? Habits in this folder will be moved to root.',
            icon: 'warning',
            onConfirm: async () => {
                try {
                    await habitFoldersService.delete(folderId);
                } catch (error) {
                    props.setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to delete folder.', icon: 'error' });
                }
            },
        });
    };

    return (
        <div className="w-72 bg-secondary border-r border-tertiary flex flex-col h-full overflow-hidden">
            <div className="p-3 flex-shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Habits</h1>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setIsCreatingFolder(true)} title="New Folder" className="p-2 rounded-md hover:bg-tertiary text-text-primary">
                            <FolderPlusIcon className="text-xl" />
                        </button>
                        <button onClick={() => props.onNewHabit()} title="New Habit" className="p-2 rounded-md hover:bg-tertiary text-text-primary">
                            <PencilIcon className="text-xl" />
                        </button>
                    </div>
                </div>
                <input
                    type="text"
                    placeholder="Search habits..."
                    value={props.searchQuery}
                    onChange={(e) => props.setSearchQuery(e.target.value)}
                    className="w-full bg-primary border border-tertiary rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
                {isCreatingFolder && (
                    <div className="flex gap-2">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Folder name..."
                            value={newFolderInputValue}
                            onChange={(e) => setNewFolderInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateFolder();
                                if (e.key === 'Escape') {
                                    setIsCreatingFolder(false);
                                    setNewFolderInputValue('');
                                }
                            }}
                            className="flex-1 px-3 py-2 bg-primary border border-tertiary rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                        />
                        <button
                            onClick={handleCreateFolder}
                            className="px-3 py-2 bg-accent text-accent-foreground rounded-md font-medium hover:opacity-90"
                        >
                            Create
                        </button>
                    </div>
                )}
            </div>

            <div className="px-3 pb-2 space-y-1 border-b border-tertiary">
                <button
                    onClick={() => props.setHabitFilter('all')}
                    title="Show All Habits"
                    className={`w-full flex items-center space-x-3 px-2 py-2 rounded-md text-sm font-medium ${
                        props.habitFilter === 'all'
                            ? 'bg-accent/30 text-accent'
                            : 'text-text-primary hover:bg-tertiary'
                    }`}
                >
                    <FireIcon className="text-xl" />
                    <span>All Habits</span>
                </button>
                <button
                    onClick={() => props.setHabitFilter('active')}
                    title="Show Active"
                    className={`w-full flex items-center space-x-3 px-2 py-2 rounded-md text-sm font-medium ${
                        props.habitFilter === 'active'
                            ? 'bg-accent/30 text-accent'
                            : 'text-text-primary hover:bg-tertiary'
                    }`}
                >
                    <PlayIcon className="text-xl" />
                    <span>Active</span>
                </button>
                <button
                    onClick={() => props.setHabitFilter('paused')}
                    title="Show Paused"
                    className={`w-full flex items-center space-x-3 px-2 py-2 rounded-md text-sm font-medium ${
                        props.habitFilter === 'paused'
                            ? 'bg-accent/30 text-accent'
                            : 'text-text-primary hover:bg-tertiary'
                    }`}
                >
                    <PauseIcon className="text-xl" />
                    <span>Paused</span>
                </button>
                <button
                    onClick={() => props.setHabitFilter('archived')}
                    title="Show Archived"
                    className={`w-full flex items-center space-x-3 px-2 py-2 rounded-md text-sm font-medium ${
                        props.habitFilter === 'archived'
                            ? 'bg-accent/30 text-accent'
                            : 'text-text-primary hover:bg-tertiary'
                    }`}
                >
                    <TrashIcon className="text-xl" />
                    <span>Archived</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
                {isFilterActive ? (
                    <div className="space-y-1">
                        {filteredHabits.map(habit => (
                            <HabitItem
                                key={habit.id}
                                habit={habit}
                                isSelected={props.selectedHabitId === habit.id}
                                onClick={() => props.setSelectedHabitId(habit.id!)}
                                streak={props.streaks[habit.id!]?.currentStreak ?? 0}
                            />
                        ))}
                    </div>
                ) : (
                    <FolderTree
                        folders={props.habitFolders}
                        habits={props.habits}
                        expandedFolders={expandedFolders}
                        onToggleFolder={handleToggleFolder}
                        selectedHabitId={props.selectedHabitId}
                        onSelectHabit={props.setSelectedHabitId}
                        onNewHabit={props.onNewHabit}
                        onRenameFolder={setRenamingFolderId}
                        onDeleteFolder={handleDeleteFolder}
                        renamingFolderId={renamingFolderId}
                        newFolderName={newFolderName}
                        setNewFolderName={setNewFolderName}
                        onConfirmRename={handleRenameFolder}
                        streaks={props.streaks}
                    />
                )}
            </div>
        </div>
    );
};

// ============ FOLDER TREE COMPONENT ============

interface FolderTreeProps {
    folders: HabitFolder[] | null;
    habits: Habit[] | null;
    expandedFolders: Set<number>;
    onToggleFolder: (folderId: number) => void;
    selectedHabitId: number | null;
    onSelectHabit: (id: number) => void;
    onNewHabit: (folderId?: number) => void;
    onRenameFolder: (folderId: number) => void;
    onDeleteFolder: (folderId: number) => void;
    renamingFolderId: number | null;
    newFolderName: string;
    setNewFolderName: (name: string) => void;
    onConfirmRename: (folderId: number, newName: string) => void;
    streaks: Record<number, { currentStreak: number; longestStreak: number }>;
}

const FolderTree: React.FC<FolderTreeProps> = (props) => {
    const rootFolders = useMemo(() => props.folders?.filter(f => !f.parentId) ?? [], [props.folders]);
    const rootHabits = useMemo(() => props.habits?.filter(h => !h.folderId) ?? [], [props.habits]);

    return (
        <div className="space-y-1">
            {rootFolders.map(folder => (
                <FolderNode
                    key={folder.id}
                    folder={folder}
                    folders={props.folders}
                    habits={props.habits}
                    expandedFolders={props.expandedFolders}
                    onToggleFolder={props.onToggleFolder}
                    selectedHabitId={props.selectedHabitId}
                    onSelectHabit={props.onSelectHabit}
                    onNewHabit={props.onNewHabit}
                    onRenameFolder={props.onRenameFolder}
                    onDeleteFolder={props.onDeleteFolder}
                    renamingFolderId={props.renamingFolderId}
                    newFolderName={props.newFolderName}
                    setNewFolderName={props.setNewFolderName}
                    onConfirmRename={props.onConfirmRename}
                    streaks={props.streaks}
                />
            ))}
            {rootHabits.map(habit => (
                <HabitItem
                    key={habit.id}
                    habit={habit}
                    isSelected={props.selectedHabitId === habit.id}
                    onClick={() => props.onSelectHabit(habit.id!)}
                    streak={props.streaks[habit.id!]?.currentStreak ?? 0}
                />
            ))}
        </div>
    );
};

// ============ FOLDER NODE COMPONENT ============

interface FolderNodeProps {
    folder: HabitFolder;
    folders: HabitFolder[] | null;
    habits: Habit[] | null;
    expandedFolders: Set<number>;
    onToggleFolder: (folderId: number) => void;
    selectedHabitId: number | null;
    onSelectHabit: (id: number) => void;
    onNewHabit: (folderId?: number) => void;
    onRenameFolder: (folderId: number) => void;
    onDeleteFolder: (folderId: number) => void;
    renamingFolderId: number | null;
    newFolderName: string;
    setNewFolderName: (name: string) => void;
    onConfirmRename: (folderId: number, newName: string) => void;
    streaks: Record<number, { currentStreak: number; longestStreak: number }>;
}

const FolderNode: React.FC<FolderNodeProps> = (props) => {
    const isExpanded = props.expandedFolders.has(props.folder.id!);
    const childFolders = useMemo(() => props.folders?.filter(f => f.parentId === props.folder.id) ?? [], [props.folders, props.folder.id]);
    const childHabits = useMemo(() => props.habits?.filter(h => h.folderId === props.folder.id) ?? [], [props.habits, props.folder.id]);

    return (
        <div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary group">
                <button
                    onClick={() => props.onToggleFolder(props.folder.id!)}
                    className="p-0.5 hover:bg-secondary rounded"
                >
                    <ChevronRightIcon className={`text-lg transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
                <FolderIcon className="text-lg text-accent" />
                {props.renamingFolderId === props.folder.id ? (
                    <input
                        autoFocus
                        type="text"
                        value={props.newFolderName}
                        onChange={(e) => props.setNewFolderName(e.target.value)}
                        onBlur={() => props.onConfirmRename(props.folder.id!, props.newFolderName)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') props.onConfirmRename(props.folder.id!, props.newFolderName);
                            if (e.key === 'Escape') props.onRenameFolder(-1);
                        }}
                        className="flex-1 bg-primary border border-tertiary rounded px-2 py-0.5 text-text-primary focus:outline-none"
                    />
                ) : (
                    <span className="flex-1 text-text-primary">{props.folder.name}</span>
                )}
                <button onClick={() => props.onNewHabit(props.folder.id!)} title="New habit in folder" className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary">
                    <AddIcon className="text-base" />
                </button>
                <button onClick={() => props.onRenameFolder(props.folder.id!)} title="Rename folder" className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary">
                    <EditIcon className="text-base" />
                </button>
                <button onClick={() => props.onDeleteFolder(props.folder.id!)} title="Delete folder" className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary">
                    <DeleteIcon className="text-base" />
                </button>
            </div>
            {isExpanded && (
                <div className="ml-4 space-y-1">
                    {childFolders.map(folder => (
                        <FolderNode
                            key={folder.id}
                            folder={folder}
                            folders={props.folders}
                            habits={props.habits}
                            expandedFolders={props.expandedFolders}
                            onToggleFolder={props.onToggleFolder}
                            selectedHabitId={props.selectedHabitId}
                            onSelectHabit={props.onSelectHabit}
                            onNewHabit={props.onNewHabit}
                            onRenameFolder={props.onRenameFolder}
                            onDeleteFolder={props.onDeleteFolder}
                            renamingFolderId={props.renamingFolderId}
                            newFolderName={props.newFolderName}
                            setNewFolderName={props.setNewFolderName}
                            onConfirmRename={props.onConfirmRename}
                            streaks={props.streaks}
                        />
                    ))}
                    {childHabits.map(habit => (
                        <HabitItem
                            key={habit.id}
                            habit={habit}
                            isSelected={props.selectedHabitId === habit.id}
                            onClick={() => props.onSelectHabit(habit.id!)}
                            streak={props.streaks[habit.id!]?.currentStreak ?? 0}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ============ HABIT ITEM COMPONENT ============

interface HabitItemProps {
    habit: Habit;
    isSelected: boolean;
    onClick: () => void;
    streak: number;
}

const HabitItem: React.FC<HabitItemProps> = (props) => {
    return (
        <button
            onClick={props.onClick}
            className={`w-full flex items-center gap-2 px-2 py-2 rounded-md transition-colors ${
                props.isSelected ? 'bg-accent text-accent-foreground' : 'text-text-primary hover:bg-primary'
            }`}
        >
            <div className="flex-1 text-left">
                <div className="font-medium truncate">{props.habit.name}</div>
                {props.streak > 0 && (
                    <div className="text-xs flex items-center gap-1 mt-0.5">
                        <FireIcon className="text-xs" />
                        <span>{props.streak} day streak</span>
                    </div>
                )}
            </div>
            {props.habit.isActive === false && (
                <PauseIcon className="text-lg text-text-muted" />
            )}
        </button>
    );
};

// ============ NAV ITEM COMPONENT ============

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = (props) => {
    return (
        <button
            onClick={props.onClick}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                props.isActive ? 'bg-accent text-accent-foreground' : 'text-text-primary hover:bg-primary'
            }`}
        >
            {props.icon}
            <span>{props.label}</span>
        </button>
    );
};

// ============ HABIT DETAIL PANEL ============

interface HabitDetailPanelProps {
    habit: Habit;
    habitLogs: HabitLog[];
    streaks: Record<number, { currentStreak: number; longestStreak: number }>;
    onBack: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onToggle: (habit: Habit, date: string) => void;
}

const HabitDetailPanel: React.FC<HabitDetailPanelProps> = (props) => {
    const last30Days = useMemo(() => {
        const days = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toISOString().split('T')[0]);
        }
        return days;
    }, []);

    const completionData = useMemo(() => {
        return last30Days.map(date => {
            const isCompleted = props.habitLogs.some(log => log.habitId === props.habit.id && log.date === date && (log.completed !== false));
            return { date, completed: isCompleted };
        });
    }, [last30Days, props.habitLogs, props.habit.id]);

    const completionRate = useMemo(() => {
        const completed = completionData.filter(d => d.completed).length;
        return Math.round((completed / completionData.length) * 100);
    }, [completionData]);

    const currentStreak = props.streaks[props.habit.id!]?.currentStreak ?? 0;
    const longestStreak = props.streaks[props.habit.id!]?.longestStreak ?? 0;

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-primary overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="flex-shrink-0 p-3 sm:p-4 border-b border-tertiary">
                <div className="flex items-center justify-between mb-3 gap-2">
                    <button onClick={props.onBack} className="lg:hidden p-2 rounded-md hover:bg-secondary flex-shrink-0 transition-colors">
                        <ArrowBackIcon className="text-xl sm:text-2xl" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold truncate">{props.habit.name}</h2>
                        {props.habit.description && <p className="text-text-muted text-xs sm:text-sm mt-1 line-clamp-2">{props.habit.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <button onClick={props.onEdit} className="p-2 rounded-md hover:bg-secondary text-text-primary transition-colors">
                            <EditIcon className="text-lg sm:text-xl" />
                        </button>
                        <button onClick={props.onDelete} className="p-2 rounded-md hover:bg-secondary text-text-primary transition-colors">
                            <DeleteIcon className="text-lg sm:text-xl" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-4 sm:space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    <StatCard
                        label="Current Streak"
                        value={currentStreak}
                        icon={<FireIcon className="text-xl sm:text-2xl text-orange-500" />}
                    />
                    <StatCard
                        label="Longest Streak"
                        value={longestStreak}
                        icon={<TrendingUpIcon className="text-xl sm:text-2xl text-blue-500" />}
                    />
                    <StatCard
                        label="Completion Rate"
                        value={`${completionRate}%`}
                        icon={<CheckCircleIcon className="text-xl sm:text-2xl text-green-500" />}
                    />
                    <StatCard
                        label="Status"
                        value={props.habit.isActive === false ? 'Paused' : 'Active'}
                        icon={props.habit.isActive === false ? <PauseIcon className="text-xl sm:text-2xl text-yellow-500" /> : <PlayIcon className="text-xl sm:text-2xl text-green-500" />}
                    />
                </div>

                {/* Calendar */}
                <div className="bg-secondary rounded-lg p-3 sm:p-4 border border-tertiary">
                    <h3 className="font-bold mb-3 sm:mb-4 text-base sm:text-lg">Last 30 Days</h3>
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {completionData.map((day, idx) => (
                            <button
                                key={idx}
                                onClick={() => props.onToggle(props.habit, day.date)}
                                className={`aspect-square rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm transition-all active:scale-95 ${
                                    day.completed
                                        ? 'bg-green-500 text-white shadow-lg hover:shadow-xl'
                                        : 'bg-primary border border-tertiary text-text-muted hover:bg-secondary active:bg-tertiary'
                                }`}
                                title={day.date}
                            >
                                {new Date(day.date).getDate()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {props.habit.category && (
                        <div className="bg-secondary rounded-lg p-3 sm:p-4 border border-tertiary">
                            <div className="text-text-muted text-xs sm:text-sm font-medium">Category</div>
                            <div className="text-base sm:text-lg font-semibold mt-2">{props.habit.category}</div>
                        </div>
                    )}

                    {props.habit.reminderEnabled && props.habit.reminderTime && (
                        <div className="bg-secondary rounded-lg p-3 sm:p-4 border border-tertiary">
                            <div className="text-text-muted text-xs sm:text-sm font-medium">Reminder</div>
                            <div className="text-base sm:text-lg font-semibold mt-2">{props.habit.reminderTime}</div>
                        </div>
                    )}

                    <div className="bg-secondary rounded-lg p-3 sm:p-4 border border-tertiary">
                        <div className="text-text-muted text-xs sm:text-sm font-medium">Frequency</div>
                        <div className="text-base sm:text-lg font-semibold mt-2 capitalize">{props.habit.frequency}</div>
                    </div>

                    {props.habit.xp && (
                        <div className="bg-secondary rounded-lg p-3 sm:p-4 border border-tertiary">
                            <div className="text-text-muted text-xs sm:text-sm font-medium">XP Reward</div>
                            <div className="text-base sm:text-lg font-semibold mt-2">{props.habit.xp} XP</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============ STAT CARD COMPONENT ============

interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = (props) => {
    return (
        <div className="bg-secondary rounded-lg p-2 sm:p-3 border border-tertiary">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
                <div className="text-text-muted text-xs font-medium">{props.label}</div>
                {props.icon}
            </div>
            <div className="text-lg sm:text-2xl font-bold">{props.value}</div>
        </div>
    );
};

// ============ HABIT EDIT MODAL ============

interface HabitEditModalProps {
    habit: Habit;
    onSave: (habit: Habit) => void;
    onClose: () => void;
}

const HabitEditModal: React.FC<HabitEditModalProps> = (props) => {
    const [formData, setFormData] = useState<Habit>(props.habit);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (field: keyof Habit, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) {
            newErrors.name = 'Habit name is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validateForm()) {
            props.onSave(formData);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-secondary rounded-lg border border-tertiary max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-xl sm:text-2xl font-bold">{formData.id ? 'Edit Habit' : 'Create New Habit'}</h2>
                        <button onClick={props.onClose} className="p-1 rounded hover:bg-primary flex-shrink-0">
                            <CloseIcon className="text-xl sm:text-2xl" />
                        </button>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-3 sm:space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-semibold mb-2">Habit Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="e.g., Morning Exercise"
                                className={`w-full px-4 py-2 bg-primary border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent transition ${
                                    errors.name ? 'border-red-500' : 'border-tertiary'
                                }`}
                            />
                            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-semibold mb-2">Description</label>
                            <textarea
                                value={formData.description || ''}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Add notes about this habit..."
                                className="w-full px-4 py-2 bg-primary border border-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none transition"
                                rows={3}
                            />
                        </div>

                        {/* Category and Frequency */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold mb-2">Category</label>
                                <input
                                    type="text"
                                    value={formData.category || ''}
                                    onChange={(e) => handleChange('category', e.target.value)}
                                    placeholder="e.g., Health, Productivity"
                                    className="w-full px-3 sm:px-4 py-2 bg-primary border border-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent transition text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-semibold mb-2">Frequency</label>
                                <select
                                    value={formData.frequency}
                                    onChange={(e) => handleChange('frequency', e.target.value)}
                                    className="w-full px-3 sm:px-4 py-2 bg-primary border border-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent transition text-sm"
                                >
                                    <option value="daily">Daily</option>
                                    <option value="custom">Custom Days</option>
                                </select>
                            </div>
                        </div>

                        {/* Reminder Settings */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="flex items-center gap-3 p-3 bg-primary rounded-lg border border-tertiary">
                                <input
                                    type="checkbox"
                                    id="reminder"
                                    checked={formData.reminderEnabled || false}
                                    onChange={(e) => handleChange('reminderEnabled', e.target.checked)}
                                    className="rounded w-4 h-4 cursor-pointer"
                                />
                                <label htmlFor="reminder" className="text-sm font-medium cursor-pointer flex-1">Enable Reminder</label>
                            </div>

                            {formData.reminderEnabled && (
                                <div>
                                    <label className="block text-xs sm:text-sm font-semibold mb-2">Reminder Time</label>
                                    <input
                                        type="time"
                                        value={formData.reminderTime || '09:00'}
                                        onChange={(e) => handleChange('reminderTime', e.target.value)}
                                        className="w-full px-3 sm:px-4 py-2 bg-primary border border-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent transition text-sm"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-3 p-3 bg-primary rounded-lg border border-tertiary">
                            <input
                                type="checkbox"
                                id="active"
                                checked={formData.isActive !== false}
                                onChange={(e) => handleChange('isActive', e.target.checked)}
                                className="rounded w-4 h-4 cursor-pointer"
                            />
                            <label htmlFor="active" className="text-xs sm:text-sm font-medium cursor-pointer flex-1">
                                {formData.isActive === false ? 'Paused' : 'Active'}
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-tertiary">
                        <button
                            onClick={handleSave}
                            className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-accent text-accent-foreground rounded-lg font-semibold text-sm sm:text-base hover:opacity-90 transition active:scale-95"
                        >
                            {formData.id ? 'Update' : 'Create'}
                        </button>
                        <button
                            onClick={props.onClose}
                            className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-primary border border-tertiary rounded-lg font-semibold text-sm sm:text-base hover:bg-secondary transition active:scale-95"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============ TOAST CONTAINER ============

interface ToastContainerProps {
    toasts: Toast[];
    setToasts: (toasts: Toast[]) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = (props) => {
    return (
        <div className="fixed bottom-4 right-4 space-y-2 z-40">
            {props.toasts.map(toast => (
                <div key={toast.id} className="bg-secondary border border-tertiary rounded-lg p-4 shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
                    <span className="material-symbols-outlined">{toast.icon}</span>
                    <div>
                        <div className="font-semibold">{toast.title}</div>
                        <div className="text-sm text-text-muted">{toast.message}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ============ UNDO SNACKBAR ============

interface UndoSnackbarProps {
    message: string;
    onUndo: () => void;
    onDismiss: () => void;
}

const UndoSnackbar: React.FC<UndoSnackbarProps> = (props) => {
    return (
        <div className="fixed bottom-4 left-4 bg-secondary border border-tertiary rounded-lg p-4 shadow-lg flex items-center justify-between gap-4 z-40 animate-in fade-in slide-in-from-bottom-4">
            <span className="text-text-primary">{props.message}</span>
            <button
                onClick={props.onUndo}
                className="px-3 py-1 bg-accent text-accent-foreground rounded-md font-medium hover:opacity-90 whitespace-nowrap"
            >
                Undo
            </button>
        </div>
    );
};

export default HabitTracker;

