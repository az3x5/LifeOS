import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { Habit, HabitLog, HabitFolder } from '../types';
import { habitsService, habitLogsService, habitFoldersService } from '../services/dataService';
import { calculateStreaks } from '../utils/habits';
import ConfirmModal from '../components/modals/ConfirmModal';
import AlertModal from '../components/modals/AlertModal';

type HabitFilter = 'all' | 'active' | 'paused' | 'today' | 'completed';

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
const CheckCircleIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>check_circle</span>;
const PencilIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>note_add</span>;
const TrashIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>delete</span>;
const MoreVertIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>more_vert</span>;
const TrendingUpIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>trending_up</span>;
const GridViewIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>grid_view</span>;
const ListViewIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>list</span>;
const CloseIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>close</span>;
const SearchIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>search</span>;
const SnoozeIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>snooze</span>;
const CheckIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>check</span>;
const EmptyIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>inbox</span>;
const ChevronLeftIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>chevron_left</span>;
const CalendarIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>calendar_today</span>;
const InfoIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>info</span>;

const getTodayDateString = () => new Date().toISOString().split('T')[0];

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
    const [viewStyle, setViewStyle] = useState<'grid' | 'list'>('grid');

    const streaks = useMemo(() => calculateStreaks(allHabits ?? [], habitLogs ?? []), [allHabits, habitLogs]);
    const [scrollY, setScrollY] = useState(0);
    const [showFAB, setShowFAB] = useState(true);

    // Track scroll for mobile FAB visibility
    useEffect(() => {
        const handleScroll = (e: Event) => {
            const target = e.target as HTMLElement;
            const currentScroll = target.scrollTop;
            setShowFAB(currentScroll < 100 || currentScroll < scrollY);
            setScrollY(currentScroll);
        };

        const mainContent = document.querySelector('[data-habits-scroll]');
        if (mainContent) {
            mainContent.addEventListener('scroll', handleScroll);
            return () => mainContent.removeEventListener('scroll', handleScroll);
        }
    }, [scrollY]);

    const selectedHabit = useMemo(() => {
        const habit = allHabits?.find(h => h.id === selectedHabitId);
        if (habit) return habit;
        if (selectedHabitId) setSelectedHabitId(null);
        return null;
    }, [allHabits, selectedHabitId]);

    const handleNewHabit = (folderId?: number) => {
        const newHabit: Habit = {
            name: 'Untitled Habit',
            frequency: 'daily',
            xp: 10,
            isActive: true,
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
            } else {
                const newHabit = await habitsService.create(habit);
                if (newHabit && newHabit.id) {
                    setHabitFilter('all');
                    handleSelectHabit(newHabit.id);
                }
            }
        } catch (error) {
            console.error('Error saving habit:', error);
            setAlertModal({
                isOpen: true,
                title: 'Error',
                message: `Failed to save habit: ${error instanceof Error ? error.message : 'Unknown error'}`,
                icon: '⚠️'
            });
        }
    };

    const displayHabits = useMemo(() => {
        let tempHabits = allHabits ?? [];
        const today = getTodayDateString();

        switch(habitFilter) {
            case 'active': tempHabits = tempHabits.filter(h => h.isActive); break;
            case 'paused': tempHabits = tempHabits.filter(h => !h.isActive); break;
            case 'today':
                tempHabits = tempHabits.filter(h => {
                    if (!h.isActive) return false;
                    if (h.frequency === 'daily') return true;
                    if (h.frequency === 'custom' && h.daysOfWeek) {
                        const dayOfWeek = new Date().getDay();
                        return h.daysOfWeek.includes(dayOfWeek);
                    }
                    return false;
                });
                break;
            case 'completed':
                tempHabits = tempHabits.filter(h => {
                    const log = habitLogs?.find(l => l.habitId === h.id && l.date === today);
                    return !!log;
                });
                break;
            default: tempHabits = tempHabits.filter(h => h.origin !== 'system-islamic');
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            tempHabits = tempHabits.filter(h => h.name.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q));
        }
        return tempHabits.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }, [allHabits, habitFilter, searchQuery, habitLogs]);

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
                onEditHabit={(habit) => {
                    setEditingHabit(habit);
                    setIsEditModalOpen(true);
                }}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isHabitsSidebarOpen={isHabitsSidebarOpen}
                setConfirmModal={setConfirmModal}
                setAlertModal={setAlertModal}
            />
            <main className="flex-1 flex flex-col min-w-0 bg-primary">
                <div className="p-4 border-b border-tertiary flex-shrink-0 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsHabitsSidebarOpen(true)} title="Toggle sidebar" className="md:hidden p-2 rounded-md text-text-primary bg-secondary border border-tertiary">
                            <MenuIcon className="text-2xl" />
                        </button>
                        <h1 className="text-2xl font-bold">Habits</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleNewHabit()}
                            title="Create new habit"
                            className="hidden sm:flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-md hover:bg-accent/90 font-medium text-sm"
                        >
                            <AddIcon className="text-lg" />
                            <span>New Habit</span>
                        </button>
                        <button
                            onClick={() => setViewStyle('grid')}
                            title="Grid view"
                            className={`p-2 rounded-md ${viewStyle === 'grid' ? 'bg-accent text-white' : 'bg-secondary text-text-primary border border-tertiary hover:bg-tertiary'}`}
                        >
                            <GridViewIcon className="text-xl" />
                        </button>
                        <button
                            onClick={() => setViewStyle('list')}
                            title="List view"
                            className={`p-2 rounded-md ${viewStyle === 'list' ? 'bg-accent text-white' : 'bg-secondary text-text-primary border border-tertiary hover:bg-tertiary'}`}
                        >
                            <ListViewIcon className="text-xl" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6" data-habits-scroll>
                    {displayHabits.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center space-y-4">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10">
                                    <EmptyIcon className="text-5xl text-accent" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-text-primary mb-2">No habits yet</h2>
                                    <p className="text-text-secondary mb-6 max-w-sm">Start building better habits today. Create your first habit to begin your journey.</p>
                                </div>
                                <button onClick={() => handleNewHabit()} className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-all duration-200 font-medium">
                                    <AddIcon className="text-lg" />
                                    Create Your First Habit
                                </button>
                            </div>
                        </div>
                    ) : viewStyle === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                            {displayHabits.map(habit => (
                                <HabitCard
                                    key={habit.id}
                                    habit={habit}
                                    isSelected={selectedHabitId === habit.id}
                                    streak={streaks[habit.id!]?.currentStreak ?? 0}
                                    isCompleted={habitLogs?.some(l => l.habitId === habit.id && l.date === getTodayDateString()) ?? false}
                                    onSelect={() => handleSelectHabit(habit.id!)}
                                    onEdit={() => {
                                        setEditingHabit(habit);
                                        setIsEditModalOpen(true);
                                    }}
                                    setConfirmModal={setConfirmModal}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3 max-w-4xl">
                            {displayHabits.map(habit => (
                                <HabitListItem
                                    key={habit.id}
                                    habit={habit}
                                    isSelected={selectedHabitId === habit.id}
                                    streak={streaks[habit.id!]?.currentStreak ?? 0}
                                    isCompleted={habitLogs?.some(l => l.habitId === habit.id && l.date === getTodayDateString()) ?? false}
                                    onSelect={() => handleSelectHabit(habit.id!)}
                                    onEdit={() => {
                                        setEditingHabit(habit);
                                        setIsEditModalOpen(true);
                                    }}
                                    setConfirmModal={setConfirmModal}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Mobile FAB */}
                {showFAB && displayHabits.length > 0 && (
                    <button
                        onClick={() => handleNewHabit()}
                        className="fixed bottom-6 right-6 md:hidden w-14 h-14 bg-accent text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center z-40"
                        title="Add new habit"
                    >
                        <AddIcon className="text-2xl" />
                    </button>
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
            {alertModal && (
                <AlertModal
                    isOpen={alertModal.isOpen}
                    title={alertModal.title}
                    message={alertModal.message}
                    icon={alertModal.icon || "⚠️"}
                    onClose={() => setAlertModal(null)}
                />
            )}
            {selectedHabit && (
                <HabitDetailPanel
                    habit={selectedHabit}
                    streak={streaks[selectedHabit.id!]?.currentStreak ?? 0}
                    isCompleted={habitLogs?.some(l => l.habitId === selectedHabit.id && l.date === getTodayDateString()) ?? false}
                    habitLogs={habitLogs}
                    onClose={() => setSelectedHabitId(null)}
                    onEdit={() => {
                        setEditingHabit(selectedHabit);
                        setIsEditModalOpen(true);
                    }}
                    onToggleCompletion={async () => {
                        const isCompleted = habitLogs?.some(l => l.habitId === selectedHabit.id && l.date === getTodayDateString()) ?? false;
                        const today = getTodayDateString();
                        if (isCompleted) {
                            const log = habitLogs?.find(l => l.habitId === selectedHabit.id && l.date === today);
                            if (log?.id) {
                                await habitLogsService.delete(log.id);
                            }
                        } else {
                            await habitLogsService.create({
                                habitId: selectedHabit.id!,
                                date: today,
                                completedAt: new Date(),
                            });
                        }
                    }}
                />
            )}
            {editingHabit && (
                <HabitEditModal
                    habit={editingHabit}
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingHabit(null);
                    }}
                    onSave={handleSaveHabit}
                    habitFolders={habitFolders}
                />
            )}
        </div>
    );
};

const Sidebar: React.FC<{
    habitFolders?: HabitFolder[]; habits?: Habit[]; habitFilter: HabitFilter; setHabitFilter: (f: HabitFilter) => void;
    selectedHabitId: number | null; setSelectedHabitId: (id: number | null) => void;
    onNewHabit: (folderId?: number) => void; onEditHabit?: (habit: Habit) => void;
    searchQuery: string; setSearchQuery: (q: string) => void;
    isHabitsSidebarOpen: boolean;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
    setAlertModal: (modal: { isOpen: boolean; title: string; message: string; icon?: string } | null) => void;
}> = (props) => {
    const [renamingHabitId, setRenamingHabitId] = useState<number|null>(null);
    const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

    const filteredHabits = useMemo(() => {
        let tempHabits = props.habits ?? [];
        switch(props.habitFilter) {
            case 'active': tempHabits = tempHabits.filter(h => h.isActive); break;
            case 'paused': tempHabits = tempHabits.filter(h => !h.isActive); break;
            case 'today':
                tempHabits = tempHabits.filter(h => {
                    if (!h.isActive) return false;
                    if (h.frequency === 'daily') return true;
                    if (h.frequency === 'custom' && h.daysOfWeek) {
                        const dayOfWeek = new Date().getDay();
                        return h.daysOfWeek.includes(dayOfWeek);
                    }
                    return false;
                });
                break;
            default: tempHabits = tempHabits.filter(h => h.origin !== 'system-islamic');
        }
        if (props.searchQuery) {
            const q = props.searchQuery.toLowerCase();
            tempHabits = tempHabits.filter(h => h.name.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q));
        }
        return tempHabits;
    }, [props.habits, props.habitFilter, props.searchQuery]);

    const handleRenameHabit = async (habit: Habit, newName: string) => {
        if (renamingHabitId !== habit.id) return;
        setRenamingHabitId(null);
        if (newName.trim() && newName.trim() !== habit.name) {
            await habitsService.update(habit.id!, { name: newName.trim(), updatedAt: new Date() });
        }
    };

    const handleNewFolder = async (parentId: number | null = null) => {
        const newFolder = await habitFoldersService.create({
            name: 'Untitled Folder',
            parentId,
            createdAt: new Date(),
        });
        if (parentId) {
            setExpandedFolders(prev => new Set(prev).add(parentId));
        }
        if (newFolder && newFolder.id) {
            setRenamingFolderId(newFolder.id);
        }
    };

    const toggleFolder = (folderId: number) => {
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderId)) newSet.delete(folderId);
            else newSet.add(folderId);
            return newSet;
        });
    };

    const isFilterActive = props.searchQuery.length > 0 || props.habitFilter !== 'all';

    return (
        <div className={`w-72 md:w-80 bg-secondary border-r border-tertiary flex flex-col transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 fixed inset-y-0 left-0 z-30 ${props.isHabitsSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-3 flex-shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Habits</h1>
                    <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNewFolder(null); }} title="New Folder" className="p-2 rounded-md hover:bg-tertiary text-text-primary">
                            <FolderPlusIcon className="text-xl" />
                        </button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.onNewHabit(); }} title="New Habit" className="p-2 rounded-md hover:bg-tertiary text-text-primary">
                            <PencilIcon className="text-xl" />
                        </button>
                    </div>
                </div>
                <input type="text" placeholder="Search habits..." value={props.searchQuery} onChange={e => props.setSearchQuery(e.target.value)}
                    className="w-full bg-primary border border-tertiary rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
            <div className="px-3 pb-2 space-y-1 border-b border-tertiary">
                <NavItem icon={<FireIcon className="text-xl"/>} label="All Habits" isActive={props.habitFilter === 'all'} onClick={() => props.setHabitFilter('all')} />
                <NavItem icon={<PlayIcon className="text-xl"/>} label="Active" isActive={props.habitFilter === 'active'} onClick={() => props.setHabitFilter('active')} />
                <NavItem icon={<PauseIcon className="text-xl"/>} label="Paused" isActive={props.habitFilter === 'paused'} onClick={() => props.setHabitFilter('paused')} />
                <NavItem icon={<CheckCircleIcon className="text-xl"/>} label="Today" isActive={props.habitFilter === 'today'} onClick={() => props.setHabitFilter('today')} />
                <NavItem icon={<CheckIcon className="text-xl"/>} label="Completed" isActive={props.habitFilter === 'completed'} onClick={() => props.setHabitFilter('completed')} />
            </div>
            <div className="flex-1 overflow-y-auto p-3">
                {isFilterActive ? (
                    <div className="space-y-1">
                        <h2 className="px-2 text-sm font-semibold text-text-secondary mb-2">{filteredHabits.length} Result(s)</h2>
                        {filteredHabits.map(habit => (
                            <HabitItem
                                key={habit.id}
                                habit={habit}
                                isSelected={props.selectedHabitId === habit.id}
                                isRenaming={renamingHabitId === habit.id}
                                onSelect={() => props.setSelectedHabitId(habit.id!)}
                                onEdit={() => props.onEditHabit?.(habit)}
                                onRename={handleRenameHabit}
                                onStartRename={() => setRenamingHabitId(habit.id!)}
                                onCancelRename={() => setRenamingHabitId(null)}
                                setConfirmModal={props.setConfirmModal}
                            />
                        ))}
                    </div>
                ) : (
                    <FolderTree
                        habitFolders={props.habitFolders}
                        habits={props.habits}
                        selectedHabitId={props.selectedHabitId}
                        setSelectedHabitId={props.setSelectedHabitId}
                        onNewHabit={props.onNewHabit}
                        onEditHabit={props.onEditHabit}
                        renamingHabitId={renamingHabitId}
                        setRenamingHabitId={setRenamingHabitId}
                        onRenameHabit={handleRenameHabit}
                        expandedFolders={expandedFolders}
                        toggleFolder={toggleFolder}
                        renamingFolderId={renamingFolderId}
                        setRenamingFolderId={setRenamingFolderId}
                        onNewFolder={handleNewFolder}
                        setConfirmModal={props.setConfirmModal}
                        setAlertModal={props.setAlertModal}
                    />
                )}
            </div>
        </div>
    );
};

const NavItem: React.FC<{ icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }> = ({ icon, label, isActive, onClick }) => (
    <button onClick={onClick} title={`Show ${label}`} className={`w-full flex items-center space-x-3 px-2 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-accent/30 text-accent' : 'text-text-primary hover:bg-tertiary'}`}>
        {icon}
        <span>{label}</span>
    </button>
);

const HabitCard: React.FC<{
    habit: Habit;
    isSelected: boolean;
    streak: number;
    isCompleted: boolean;
    onSelect: () => void;
    onEdit: () => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({ habit, isSelected, streak, isCompleted, onSelect, onEdit, setConfirmModal }) => {
    const [showMenu, setShowMenu] = useState(false);

    const handleDelete = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Habit',
            message: `Are you sure you want to delete "${habit.name}"?`,
            icon: '🗑️',
            onConfirm: async () => {
                await habitsService.delete(habit.id!);
                setConfirmModal(null);
            }
        });
    };

    const handleToggleActive = async () => {
        await habitsService.update(habit.id!, { isActive: !habit.isActive });
    };

    const handleToggleCompletion = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const today = getTodayDateString();
        if (isCompleted) {
            const log = await habitLogsService.getAll();
            const todayLog = log?.find(l => l.habitId === habit.id && l.date === today);
            if (todayLog?.id) {
                await habitLogsService.delete(todayLog.id);
            }
        } else {
            await habitLogsService.create({
                habitId: habit.id!,
                date: today,
                completedAt: new Date(),
            });
        }
    };

    return (
        <div onClick={onSelect} className={`bg-secondary border-2 rounded-2xl p-4 md:p-5 cursor-pointer transition-all duration-300 hover:shadow-lg ${isSelected ? 'border-accent bg-accent/10 shadow-lg' : 'border-tertiary hover:border-accent/50 hover:shadow-md'}`}>
            {/* Header with title and actions */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-base md:text-lg truncate ${!habit.isActive ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                        {habit.name}
                    </h3>
                    {habit.category && (
                        <p className="text-xs text-text-secondary mt-1">{habit.category}</p>
                    )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {habit.isActive && (
                        <button
                            onClick={handleToggleCompletion}
                            title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                            className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-110 ${isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-tertiary text-text-secondary hover:bg-accent/20'}`}
                        >
                            <CheckCircleIcon className="text-lg" />
                        </button>
                    )}
                    <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="p-2 hover:bg-tertiary rounded-lg transition-colors">
                            <MoreVertIcon className="text-lg" />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-tertiary border border-primary rounded-lg shadow-xl z-50 w-44 overflow-hidden">
                                <button onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent hover:text-white flex items-center gap-2 transition-colors">
                                    <PencilIcon className="text-lg" /> Edit
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleToggleActive(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent hover:text-white flex items-center gap-2 transition-colors">
                                    {habit.isActive ? <PauseIcon className="text-lg" /> : <PlayIcon className="text-lg" />} {habit.isActive ? 'Pause' : 'Resume'}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-500/20 text-red-400 flex items-center gap-2 transition-colors">
                                    <TrashIcon className="text-lg" /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Description */}
            {habit.description && (
                <p className="text-sm text-text-secondary mb-3 line-clamp-2">{habit.description}</p>
            )}

            {/* Progress bar */}
            <div className="mb-3">
                <div className="h-2 bg-tertiary rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${isCompleted ? 'bg-gradient-to-r from-green-500 to-green-400 w-full' : 'bg-gradient-to-r from-accent to-indigo-400 w-1/3'}`} />
                </div>
            </div>

            {/* Status badges and streak */}
            <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${habit.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {habit.isActive ? 'Active' : 'Paused'}
                </span>
                {streak > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 flex items-center gap-1 font-medium">
                        <FireIcon className="text-xs" /> {streak}
                    </span>
                )}
                {isCompleted && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1 font-medium">
                        <CheckIcon className="text-xs" /> Done
                    </span>
                )}
            </div>
        </div>
    );
};

const HabitListItem: React.FC<{
    habit: Habit;
    isSelected: boolean;
    streak: number;
    isCompleted: boolean;
    onSelect: () => void;
    onEdit: () => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({ habit, isSelected, streak, isCompleted, onSelect, onEdit, setConfirmModal }) => {
    const [showMenu, setShowMenu] = useState(false);

    const handleDelete = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Habit',
            message: `Are you sure you want to delete "${habit.name}"?`,
            icon: '🗑️',
            onConfirm: async () => {
                await habitsService.delete(habit.id!);
                setConfirmModal(null);
            }
        });
    };

    const handleToggleActive = async () => {
        await habitsService.update(habit.id!, { isActive: !habit.isActive });
    };

    const handleToggleCompletion = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const today = getTodayDateString();
        if (isCompleted) {
            const log = await habitLogsService.getAll();
            const todayLog = log?.find(l => l.habitId === habit.id && l.date === today);
            if (todayLog?.id) {
                await habitLogsService.delete(todayLog.id);
            }
        } else {
            await habitLogsService.create({
                habitId: habit.id!,
                date: today,
                completedAt: new Date(),
            });
        }
    };

    return (
        <div onClick={onSelect} className={`bg-secondary border-2 rounded-2xl p-4 cursor-pointer transition-all duration-300 flex items-center justify-between hover:shadow-md ${isSelected ? 'border-accent bg-accent/10 shadow-md' : 'border-tertiary hover:border-accent/50'}`}>
            <div className="flex-1 min-w-0 flex items-center gap-4">
                {/* Completion indicator */}
                <div className={`flex-shrink-0 w-1 h-12 rounded-full transition-all ${isCompleted ? 'bg-green-500' : 'bg-tertiary'}`} />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className={`font-semibold flex-1 truncate ${!habit.isActive ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                            {habit.name}
                        </h3>
                        {streak > 0 && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 whitespace-nowrap flex items-center gap-1 font-medium">
                                <FireIcon className="text-xs" /> {streak}
                            </span>
                        )}
                    </div>
                    {habit.description && (
                        <p className="text-xs text-text-secondary truncate">{habit.description}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {habit.isActive && (
                    <button
                        onClick={handleToggleCompletion}
                        title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                        className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-110 ${isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-tertiary text-text-secondary hover:bg-accent/20'}`}
                    >
                        <CheckCircleIcon className="text-lg" />
                    </button>
                )}
                <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="p-2 hover:bg-tertiary rounded-lg transition-colors">
                        <MoreVertIcon className="text-lg" />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-tertiary border border-primary rounded-lg shadow-xl z-50 w-44 overflow-hidden">
                            <button onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent hover:text-white flex items-center gap-2 transition-colors">
                                <PencilIcon className="text-lg" /> Edit
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleToggleActive(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent hover:text-white flex items-center gap-2 transition-colors">
                                {habit.isActive ? <PauseIcon className="text-lg" /> : <PlayIcon className="text-lg" />} {habit.isActive ? 'Pause' : 'Resume'}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-500/20 text-red-400 flex items-center gap-2 transition-colors">
                                <TrashIcon className="text-lg" /> Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const FolderTree: React.FC<{
    habitFolders?: HabitFolder[]; habits?: Habit[]; parentId?: number | null; level?: number;
    selectedHabitId: number | null; setSelectedHabitId: (id: number | null) => void;
    onNewHabit: (folderId?: number) => void; onEditHabit?: (habit: Habit) => void; renamingHabitId: number | null; setRenamingHabitId: (id: number | null) => void;
    onRenameHabit: (habit: Habit, newName: string) => void;
    expandedFolders: Set<number>; toggleFolder: (folderId: number) => void;
    renamingFolderId: number | null; setRenamingFolderId: (id: number | null) => void;
    onNewFolder: (parentId: number | null) => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
    setAlertModal: (modal: { isOpen: boolean; title: string; message: string; icon?: string } | null) => void;
}> = (props) => {
    const { habitFolders, habits, parentId = null, level = 0, selectedHabitId, setSelectedHabitId, onNewHabit, onEditHabit, renamingHabitId, setRenamingHabitId, onRenameHabit, expandedFolders, toggleFolder, renamingFolderId, setRenamingFolderId, onNewFolder } = props;

    const childFolders = useMemo(() => habitFolders?.filter(f => f.parentId === parentId) ?? [], [habitFolders, parentId]);
    const childHabits = useMemo(() => habits?.filter(h => h.folderId === (parentId || undefined) && h.isActive).sort((a,b) => a.name.localeCompare(b.name)) ?? [], [habits, parentId]);

    const handleRenameFolder = async (folder: HabitFolder, newName: string) => {
        if (renamingFolderId !== folder.id) return;
        setRenamingFolderId(null);
        if(newName.trim() && newName.trim() !== folder.name) {
            await habitFoldersService.update(folder.id!, { name: newName.trim() });
        }
    }

    const handleDeleteFolder = async (folder: HabitFolder) => {
        const childHabitsCount = (props.habits?.filter(h => h.folderId === folder.id) || []).length;
        const childFoldersCount = (props.habitFolders?.filter(f => f.parentId === folder.id) || []).length;
        if (childHabitsCount > 0 || childFoldersCount > 0) {
            props.setAlertModal({
                isOpen: true,
                title: 'Cannot Delete Folder',
                message: "Cannot delete a non-empty folder.",
                icon: '📁'
            });
            return;
        }
        props.setConfirmModal({
            isOpen: true,
            title: 'Delete Folder',
            message: `Are you sure you want to delete the folder "${folder.name}"?`,
            icon: '📁',
            onConfirm: async () => {
                await habitFoldersService.delete(folder.id!);
                props.setConfirmModal(null);
            }
        });
    };

    return (
        <div style={{ marginLeft: level > 0 ? `16px` : `0px` }}>
            {childFolders.map(folder => (
                <div key={folder.id}>
                    {renamingFolderId === folder.id ? (
                        <div className="py-1">
                            <input type="text" defaultValue={folder.name} autoFocus
                                onBlur={(e) => handleRenameFolder(folder, e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameFolder(folder, e.currentTarget.value);
                                    if (e.key === 'Escape') setRenamingFolderId(null);
                                }}
                                className="w-full bg-primary border border-accent rounded-md py-1 px-2 text-sm"
                            />
                        </div>
                    ) : (
                        <div className="w-full text-left flex items-center pr-1 rounded-md text-sm group" >
                            <button onClick={() => toggleFolder(folder.id!)} title={expandedFolders.has(folder.id!) ? 'Collapse folder' : 'Expand folder'} className={`flex-1 flex items-center p-1 rounded-md text-text-primary hover:bg-tertiary`}>
                                <ChevronRightIcon className={`transition-transform text-lg ${expandedFolders.has(folder.id!) ? 'rotate-90' : ''}`} />
                                <FolderIcon className="text-lg mr-2" />
                                <span className="truncate">{folder.name}</span>
                            </button>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onNewHabit(folder.id)} title="New Habit" className="p-1 hover:bg-tertiary rounded text-text-primary">
                                    <AddIcon className="text-lg" />
                                </button>
                                <button onClick={() => onNewFolder(folder.id!)} title="New Subfolder" className="p-1 hover:bg-tertiary rounded text-text-primary">
                                    <FolderPlusIcon className="text-lg" />
                                </button>
                                <button onClick={() => setRenamingFolderId(folder.id!)} title="Rename" className="p-1 hover:bg-tertiary rounded text-text-primary">
                                    <PencilIcon className="text-lg" />
                                </button>
                                <button onClick={() => handleDeleteFolder(folder)} title="Delete" className="p-1 hover:bg-red-500/20 rounded text-red-400">
                                    <TrashIcon className="text-lg" />
                                </button>
                            </div>
                        </div>
                    )}
                    {expandedFolders.has(folder.id!) && (
                        <FolderTree {...props} parentId={folder.id} level={level + 1} />
                    )}
                </div>
            ))}

            <div className="border-l border-tertiary/50" style={{ marginLeft: '7px' }}>
                {childHabits.map(habit => (
                    <HabitItem key={habit.id} habit={habit} level={level} isSelected={selectedHabitId === habit.id} isRenaming={renamingHabitId === habit.id} onSelect={() => setSelectedHabitId(habit.id!)} onEdit={() => { props.onEditHabit?.(habit); }} onRename={onRenameHabit} onStartRename={() => setRenamingHabitId(habit.id!)} onCancelRename={()=> setRenamingHabitId(null)} setConfirmModal={props.setConfirmModal} />
                ))}
            </div>
        </div>
    );
};

const HabitItem: React.FC<{
    habit: Habit; level?: number; isSelected: boolean; isRenaming: boolean;
    onSelect: () => void; onEdit: () => void; onRename: (habit: Habit, newName: string) => void;
    onStartRename: () => void; onCancelRename: () => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({ habit, level=0, isSelected, isRenaming, onSelect, onEdit, onRename, onStartRename, onCancelRename, setConfirmModal }) => {
    if (isRenaming) {
        return (
            <div style={{ paddingLeft: `${(level * 16) + 16}px`}} className="py-1">
                <input type="text" defaultValue={habit.name} autoFocus
                    onBlur={(e) => onRename(habit, e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onRename(habit, e.currentTarget.value);
                        if (e.key === 'Escape') onCancelRename();
                    }}
                    className="w-full bg-primary border border-accent rounded-md py-1 px-2 text-sm"
                />
            </div>
        )
    }
    return (
        <div className="w-full text-left flex items-center pr-1 rounded-md text-sm group" style={{ paddingLeft: `${level * 16}px`}}>
            <button onClick={onSelect} title={habit.name} className={`flex-1 flex items-center p-1 rounded-md truncate ${isSelected ? 'bg-accent/30' : 'hover:bg-tertiary'}`}>
                <FireIcon className={`text-lg mr-2 flex-shrink-0 ${isSelected ? 'text-accent' : 'text-text-secondary'}`} />
                <span className={`truncate ${isSelected ? 'text-accent' : 'text-text-primary'}`}>{habit.name}</span>
            </button>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onEdit} title="Edit" className="p-1 hover:bg-tertiary rounded text-text-primary">
                    <PencilIcon className="text-lg" />
                </button>
                <button onClick={onStartRename} title="Rename" className="p-1 hover:bg-tertiary rounded text-text-primary">
                    <EditIcon className="text-lg" />
                </button>
                <button onClick={() => setConfirmModal({
                    isOpen: true,
                    title: 'Delete Habit',
                    message: `Are you sure you want to delete "${habit.name}"?`,
                    icon: '🗑️',
                    onConfirm: async () => {
                        await habitsService.delete(habit.id!);
                        setConfirmModal(null);
                    }
                })} title="Delete" className="p-1 hover:bg-red-500/20 rounded text-red-400">
                    <TrashIcon className="text-lg" />
                </button>
            </div>
        </div>
    )
}

const HabitDetailPanel: React.FC<{
    habit: Habit | null;
    streak: number;
    isCompleted: boolean;
    habitLogs?: HabitLog[];
    onClose: () => void;
    onEdit: () => void;
    onToggleCompletion: () => void;
}> = ({ habit, streak, isCompleted, habitLogs, onClose, onEdit, onToggleCompletion }) => {
    if (!habit) return null;

    const today = getTodayDateString();
    const completionRate = habitLogs ? (habitLogs.filter(l => l.habitId === habit.id).length / 30) * 100 : 0;

    return (
        <>
            {/* Mobile Modal Overlay */}
            <div className="fixed inset-0 bg-black/50 md:hidden z-40" onClick={onClose} />

            {/* Detail Panel - Desktop Side Panel / Mobile Modal */}
            <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-secondary border-l border-tertiary shadow-2xl z-50 flex flex-col md:rounded-l-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-tertiary">
                    <h2 className="text-xl font-bold text-text-primary">Habit Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-tertiary rounded-lg transition-colors"
                    >
                        <CloseIcon className="text-xl" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    {/* Habit Name */}
                    <div>
                        <h3 className={`text-2xl font-bold ${!habit.isActive ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                            {habit.name}
                        </h3>
                        {habit.category && (
                            <p className="text-sm text-text-secondary mt-2">{habit.category}</p>
                        )}
                    </div>

                    {/* Status */}
                    <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${habit.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            {habit.isActive ? 'Active' : 'Paused'}
                        </span>
                        {isCompleted && (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400 flex items-center gap-1">
                                <CheckIcon className="text-sm" /> Done Today
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    {habit.description && (
                        <div>
                            <h4 className="text-sm font-semibold text-text-secondary mb-2">Description</h4>
                            <p className="text-text-primary">{habit.description}</p>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-primary rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <FireIcon className="text-orange-400 text-lg" />
                                <span className="text-sm text-text-secondary">Current Streak</span>
                            </div>
                            <p className="text-2xl font-bold text-text-primary">{streak}</p>
                        </div>
                        <div className="bg-primary rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckIcon className="text-green-400 text-lg" />
                                <span className="text-sm text-text-secondary">Completion</span>
                            </div>
                            <p className="text-2xl font-bold text-text-primary">{Math.round(completionRate)}%</p>
                        </div>
                    </div>

                    {/* Frequency */}
                    <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-2">Frequency</h4>
                        <p className="text-text-primary capitalize">{habit.frequency === 'daily' ? 'Every Day' : 'Custom Days'}</p>
                        {habit.frequency === 'custom' && habit.daysOfWeek && (
                            <div className="flex gap-2 mt-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                    <span
                                        key={idx}
                                        className={`w-8 h-8 flex items-center justify-center rounded text-xs font-medium ${
                                            habit.daysOfWeek?.includes(idx)
                                                ? 'bg-accent text-white'
                                                : 'bg-tertiary text-text-secondary'
                                        }`}
                                    >
                                        {day}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Created Date */}
                    <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-2">
                            <CalendarIcon className="text-lg" /> Created
                        </h4>
                        <p className="text-text-primary">
                            {habit.createdAt ? new Date(habit.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>

                    {/* XP Reward */}
                    <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-2">XP Reward</h4>
                        <p className="text-text-primary font-semibold text-lg">{habit.xp} XP</p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="border-t border-tertiary p-4 md:p-6 space-y-3">
                    {habit.isActive && (
                        <button
                            onClick={onToggleCompletion}
                            className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
                                isCompleted
                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                    : 'bg-accent text-white hover:bg-accent/90'
                            }`}
                        >
                            {isCompleted ? '✓ Completed Today' : 'Mark as Complete'}
                        </button>
                    )}
                    <button
                        onClick={onEdit}
                        className="w-full py-3 bg-tertiary text-text-primary rounded-lg font-medium hover:bg-tertiary/80 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        <EditIcon className="text-lg" /> Edit Habit
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-primary text-text-primary rounded-lg font-medium hover:bg-primary/80 transition-all duration-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </>
    );
};

const HabitEditModal: React.FC<{
    habit: Habit;
    isOpen: boolean;
    onClose: () => void;
    onSave: (habit: Habit) => void;
    habitFolders?: HabitFolder[];
}> = ({ habit, isOpen, onClose, onSave, habitFolders }) => {
    const [name, setName] = useState(habit.name);
    const [description, setDescription] = useState(habit.description || '');
    const [frequency, setFrequency] = useState(habit.frequency || 'daily');
    const [daysOfWeek, setDaysOfWeek] = useState(habit.daysOfWeek || []);
    const [category, setCategory] = useState(habit.category || 'personal');
    const [xp, setXp] = useState(habit.xp || 10);
    const [isActive, setIsActive] = useState(habit.isActive ?? true);
    const [folderId, setFolderId] = useState(habit.folderId || null);

    const handleSave = useCallback(async () => {
        if (!name.trim()) return;
        try {
            await onSave({
                ...habit,
                name,
                description,
                frequency: frequency as 'daily' | 'custom',
                daysOfWeek: frequency === 'custom' ? daysOfWeek : undefined,
                category,
                xp,
                isActive,
                folderId,
                updatedAt: new Date(),
            });
            onClose();
        } catch (error) {
            console.error('Error saving habit:', error);
        }
    }, [name, description, frequency, daysOfWeek, category, xp, isActive, folderId, habit, onSave, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">{habit.id ? 'Edit Habit' : 'Create Habit'}</h2>
                        <button onClick={onClose} className="p-2 hover:bg-tertiary rounded-lg">
                            <CloseIcon className="text-xl" />
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Habit Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                            placeholder="Enter habit name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                            rows={3}
                            placeholder="Add details..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Frequency</label>
                            <select
                                value={frequency}
                                onChange={e => setFrequency(e.target.value)}
                                className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                            >
                                <option value="daily">Daily</option>
                                <option value="custom">Custom Days</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">XP Reward</label>
                            <input
                                type="number"
                                value={xp}
                                onChange={e => setXp(parseInt(e.target.value) || 10)}
                                className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                                min="1"
                            />
                        </div>
                    </div>

                    {frequency === 'custom' && (
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Days of Week</label>
                            <div className="grid grid-cols-7 gap-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            if (daysOfWeek.includes(idx)) {
                                                setDaysOfWeek(daysOfWeek.filter(d => d !== idx));
                                            } else {
                                                setDaysOfWeek([...daysOfWeek, idx]);
                                            }
                                        }}
                                        className={`py-2 rounded text-xs font-medium transition-all ${
                                            daysOfWeek.includes(idx)
                                                ? 'bg-accent text-white'
                                                : 'bg-tertiary text-text-primary hover:bg-tertiary/80'
                                        }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Category</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                            >
                                <option value="personal">Personal</option>
                                <option value="health">Health</option>
                                <option value="fitness">Fitness</option>
                                <option value="learning">Learning</option>
                                <option value="work">Work</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Folder</label>
                            <select
                                value={folderId || ''}
                                onChange={e => setFolderId(e.target.value ? parseInt(e.target.value) : null)}
                                className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                            >
                                <option value="">No Folder</option>
                                {habitFolders?.map(folder => (
                                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-primary rounded-lg">
                        <label className="text-sm font-medium text-text-primary">Active</label>
                        <button
                            onClick={() => setIsActive(!isActive)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                isActive
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-gray-500/20 text-gray-400'
                            }`}
                        >
                            {isActive ? 'Active' : 'Paused'}
                        </button>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-tertiary text-text-primary rounded-lg hover:bg-tertiary/80 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!name.trim()}
                            className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 font-medium disabled:opacity-50"
                        >
                            {habit.id ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HabitTracker;

