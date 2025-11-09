import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { Habit, HabitLog, HabitFolder, UserProfile, Badge, UserBadge } from '../types';
import { habitsService, habitLogsService, habitFoldersService } from '../services/dataService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { calculateStreaks } from '../utils/habits';
import ConfirmModal from '../components/modals/ConfirmModal';
import AlertModal from '../components/modals/AlertModal';

type HabitFilter = 'all' | 'active' | 'paused' | 'archived';

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
const MoreVertIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>more_vert</span>;
const DeleteIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>delete</span>;
const EditIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>edit</span>;
const PauseIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>pause</span>;
const PlayIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>play_arrow</span>;
const SearchIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>search</span>;
const CloseIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>close</span>;
const CheckCircleIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>check_circle</span>;
const PencilIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>note_add</span>;
const TrashIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>delete</span>;

const HabitTracker: React.FC = () => {
    const allHabits = useSupabaseQuery<Habit>('habits');
    const habitFolders = useSupabaseQuery<HabitFolder>('habit_folders');
    const habitLogs = useSupabaseQuery<HabitLog>('habit_logs');

    const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
    const [habitFilter, setHabitFilter] = useState<HabitFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isHabitsSidebarOpen, setIsHabitsSidebarOpen] = useState(false);
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
        setIsHabitsSidebarOpen(false);
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
            const undoFunc = async () => { await habitLogsService.create({ habitId: habit.id!, date }); };
            setUndoAction({ message: `"${habit.name}" marked incomplete.`, onUndo: undoFunc });
        } else {
            const newLog = await habitLogsService.create({ habitId: habit.id!, date });
            const undoFunc = async () => { if (newLog && newLog.id) await habitLogsService.delete(newLog.id); };
            setUndoAction({ message: `"${habit.name}" completed!`, onUndo: undoFunc });
        }

        undoTimeoutRef.current = window.setTimeout(() => setUndoAction(null), 6000);
    }, [habitLogs, addToast]);

    return (
        <div className="flex h-full bg-primary font-sans relative overflow-hidden">
            {isHabitsSidebarOpen && (
                <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setIsHabitsSidebarOpen(false)} />
            )}
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
                isHabitsSidebarOpen={isHabitsSidebarOpen}
                setConfirmModal={setConfirmModal}
                setAlertModal={setAlertModal}
                streaks={streaks}
            />
            <main className="flex-1 flex flex-col min-w-0">
                {selectedHabit ? (
                    <HabitDetailPanel
                        key={selectedHabit.id}
                        habit={selectedHabit}
                        habitLogs={habitLogs ?? []}
                        streaks={streaks}
                        toggleSidebar={() => setIsHabitsSidebarOpen(p => !p)}
                        onEdit={() => {
                            setEditingHabit(selectedHabit);
                            setIsEditModalOpen(true);
                        }}
                        onDelete={() => handleDeleteHabit(selectedHabit.id!)}
                        onToggle={handleToggleHabit}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-text-muted bg-primary relative">
                        <button onClick={() => setIsHabitsSidebarOpen(true)} title="Open habits list" className="md:hidden absolute top-4 left-4 p-2 rounded-md text-text-primary bg-secondary border border-tertiary">
                            <MenuIcon className="text-2xl" />
                        </button>
                        <div className="text-center">
                            <FireIcon className="text-6xl mx-auto text-tertiary" />
                            <h2 className="mt-4 text-xl font-semibold">Select a habit</h2>
                            <p>Choose a habit from the list to view or edit it.</p>
                        </div>
                    </div>
                )}
            </main>

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
    isHabitsSidebarOpen: boolean;
    setConfirmModal: (modal: any) => void;
    setAlertModal: (modal: any) => void;
    streaks: Record<number, number>;
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
        <div className={`w-72 md:w-80 bg-secondary border-r border-tertiary flex flex-col transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 fixed inset-y-0 left-0 z-30 ${props.isHabitsSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="px-3 pt-3 pb-0 flex-shrink-0 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <h1 className="text-2xl font-bold flex-1">Habits</h1>
                    <button onClick={() => setIsCreatingFolder(true)} title="New folder" className="p-2 rounded-md hover:bg-primary text-text-primary flex-shrink-0">
                        <FolderPlusIcon className="text-lg" />
                    </button>
                    <button onClick={() => props.onNewHabit()} title="New habit" className="p-2 rounded-md hover:bg-primary text-text-primary flex-shrink-0">
                        <PencilIcon className="text-lg" />
                    </button>
                </div>
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted text-lg" />
                    <input
                        type="text"
                        placeholder="Search habits..."
                        value={props.searchQuery}
                        onChange={(e) => props.setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-primary border border-tertiary rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                </div>
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

            <div className="px-3 py-2 space-y-1 border-b border-tertiary">
                <NavItem
                    icon={<FireIcon className="text-base" />}
                    label="All"
                    isActive={props.habitFilter === 'all'}
                    onClick={() => props.setHabitFilter('all')}
                />
                <NavItem
                    icon={<PlayIcon className="text-base" />}
                    label="Active"
                    isActive={props.habitFilter === 'active'}
                    onClick={() => props.setHabitFilter('active')}
                />
                <NavItem
                    icon={<PauseIcon className="text-base" />}
                    label="Paused"
                    isActive={props.habitFilter === 'paused'}
                    onClick={() => props.setHabitFilter('paused')}
                />
                <NavItem
                    icon={<TrashIcon className="text-base" />}
                    label="Archived"
                    isActive={props.habitFilter === 'archived'}
                    onClick={() => props.setHabitFilter('archived')}
                />
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
                {isFilterActive ? (
                    <div className="space-y-1">
                        {filteredHabits.map(habit => (
                            <HabitItem
                                key={habit.id}
                                habit={habit}
                                isSelected={props.selectedHabitId === habit.id}
                                onClick={() => props.setSelectedHabitId(habit.id!)}
                                streak={props.streaks[habit.id!] ?? 0}
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
    streaks: Record<number, number>;
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
                    streak={props.streaks[habit.id!] ?? 0}
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
    streaks: Record<number, number>;
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
                            streak={props.streaks[habit.id!] ?? 0}
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
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
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
    streaks: Record<number, number>;
    toggleSidebar: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onToggle: (habit: Habit, date: string) => void;
}

const HabitDetailPanel: React.FC<HabitDetailPanelProps> = (props) => {
    const last14Days = useMemo(() => {
        const days = [];
        for (let i = 13; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toISOString().split('T')[0]);
        }
        return days;
    }, []);

    const completionData = useMemo(() => {
        return last14Days.map(date => {
            const isCompleted = props.habitLogs.some(log => log.habitId === props.habit.id && log.date === date && log.completed);
            return { date, completed: isCompleted };
        });
    }, [last14Days, props.habitLogs, props.habit.id]);

    const completionRate = useMemo(() => {
        const completed = completionData.filter(d => d.completed).length;
        return Math.round((completed / completionData.length) * 100);
    }, [completionData]);

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-primary">
            <div className="flex items-center justify-between p-4 border-b border-tertiary flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={props.toggleSidebar} className="md:hidden p-2 rounded-md hover:bg-secondary">
                        <MenuIcon className="text-2xl" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold">{props.habit.name}</h2>
                        {props.habit.description && <p className="text-text-muted text-sm">{props.habit.description}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={props.onEdit} className="p-2 rounded-md hover:bg-secondary text-text-primary">
                        <EditIcon className="text-xl" />
                    </button>
                    <button onClick={props.onDelete} className="p-2 rounded-md hover:bg-secondary text-text-primary">
                        <DeleteIcon className="text-xl" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 pl-0 py-4 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-secondary rounded-lg p-4 border border-tertiary">
                        <div className="text-text-muted text-sm">Current Streak</div>
                        <div className="text-3xl font-bold flex items-center gap-2 mt-2">
                            <FireIcon className="text-2xl text-orange-500" />
                            {props.streaks[props.habit.id!] ?? 0}
                        </div>
                    </div>
                    <div className="bg-secondary rounded-lg p-4 border border-tertiary">
                        <div className="text-text-muted text-sm">Completion Rate</div>
                        <div className="text-3xl font-bold mt-2">{completionRate}%</div>
                    </div>
                    <div className="bg-secondary rounded-lg p-4 border border-tertiary">
                        <div className="text-text-muted text-sm">Status</div>
                        <div className="text-lg font-bold mt-2 flex items-center gap-2">
                            {props.habit.isActive === false ? (
                                <>
                                    <PauseIcon className="text-xl" />
                                    Paused
                                </>
                            ) : (
                                <>
                                    <PlayIcon className="text-xl text-green-500" />
                                    Active
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-secondary rounded-lg p-4 border border-tertiary">
                    <h3 className="font-bold mb-4">Last 14 Days</h3>
                    <div className="grid grid-cols-7 gap-2">
                        {completionData.map((day, idx) => (
                            <button
                                key={idx}
                                onClick={() => props.onToggle(props.habit, day.date)}
                                className={`aspect-square rounded-lg flex items-center justify-center font-bold transition-colors ${
                                    day.completed
                                        ? 'bg-green-500 text-white'
                                        : 'bg-primary border border-tertiary text-text-muted hover:bg-secondary'
                                }`}
                                title={day.date}
                            >
                                {new Date(day.date).getDate()}
                            </button>
                        ))}
                    </div>
                </div>

                {props.habit.category && (
                    <div className="bg-secondary rounded-lg p-4 border border-tertiary">
                        <div className="text-text-muted text-sm">Category</div>
                        <div className="text-lg font-semibold mt-2">{props.habit.category}</div>
                    </div>
                )}

                {props.habit.reminderEnabled && props.habit.reminderTime && (
                    <div className="bg-secondary rounded-lg p-4 border border-tertiary">
                        <div className="text-text-muted text-sm">Reminder</div>
                        <div className="text-lg font-semibold mt-2">{props.habit.reminderTime}</div>
                    </div>
                )}
            </div>
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

    const handleChange = (field: keyof Habit, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-lg border border-tertiary max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">{formData.id ? 'Edit Habit' : 'New Habit'}</h2>
                        <button onClick={props.onClose} className="p-1 rounded hover:bg-primary">
                            <CloseIcon className="text-2xl" />
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full px-3 py-2 bg-primary border border-tertiary rounded-md text-text-primary focus:outline-none focus:border-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                            value={formData.description || ''}
                            onChange={(e) => handleChange('description', e.target.value)}
                            className="w-full px-3 py-2 bg-primary border border-tertiary rounded-md text-text-primary focus:outline-none focus:border-accent resize-none"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Category</label>
                        <input
                            type="text"
                            value={formData.category || ''}
                            onChange={(e) => handleChange('category', e.target.value)}
                            className="w-full px-3 py-2 bg-primary border border-tertiary rounded-md text-text-primary focus:outline-none focus:border-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Frequency</label>
                        <select
                            value={formData.frequency}
                            onChange={(e) => handleChange('frequency', e.target.value)}
                            className="w-full px-3 py-2 bg-primary border border-tertiary rounded-md text-text-primary focus:outline-none focus:border-accent"
                        >
                            <option value="daily">Daily</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="active"
                            checked={formData.isActive !== false}
                            onChange={(e) => handleChange('isActive', e.target.checked)}
                            className="rounded"
                        />
                        <label htmlFor="active" className="text-sm">Active</label>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button
                            onClick={() => props.onSave(formData)}
                            className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-md font-medium hover:opacity-90"
                        >
                            Save
                        </button>
                        <button
                            onClick={props.onClose}
                            className="flex-1 px-4 py-2 bg-primary border border-tertiary rounded-md font-medium hover:bg-secondary"
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

