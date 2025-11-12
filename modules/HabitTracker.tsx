import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { Habit, HabitLog, HabitFolder } from '../types';
import { habitsService, habitLogsService, habitFoldersService } from '../services/dataService';
import { calculateStreaks } from '../utils/habits';
import ConfirmModal from '../components/modals/ConfirmModal';
import AlertModal from '../components/modals/AlertModal';

const TABS = ['Dashboard', 'All Habits', 'Active', 'Completed'];
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

    const [activeTab, setActiveTab] = useState(TABS[0]);
    const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null>(null);
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; icon?: string } | null>(null);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [viewStyle, setViewStyle] = useState<'grid' | 'list'>('grid');

    const streaks = useMemo(() => calculateStreaks(allHabits ?? [], habitLogs ?? []), [allHabits, habitLogs]);

    const selectedHabit = useMemo(() => {
        const habit = allHabits?.find(h => h.id === selectedHabitId);
        if (habit) return habit;
        if (selectedHabitId) setSelectedHabitId(null);
        return null;
    }, [allHabits, selectedHabitId]);

    const handleNewHabit = () => {
        const newHabit: Habit = {
            name: 'Untitled Habit',
            frequency: 'daily',
            xp: 10,
            isActive: true,
            origin: 'user',
            createdAt: new Date(),
            folderId: null,
        };
        setEditingHabit(newHabit);
        setIsEditModalOpen(true);
    };

    const handleSelectHabit = (id: number | null) => {
        setSelectedHabitId(id);
    };

    const handleSaveHabit = async (habit: Habit) => {
        try {
            if (habit.id) {
                await habitsService.update(habit.id, habit);
            } else {
                const newHabit = await habitsService.create(habit);
                if (newHabit && newHabit.id) {
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

    const getFilteredHabits = useCallback((filter: string) => {
        let tempHabits = allHabits ?? [];
        const today = getTodayDateString();

        switch(filter) {
            case 'Active':
                tempHabits = tempHabits.filter(h => h.isActive && h.origin !== 'system-islamic');
                break;
            case 'Completed':
                tempHabits = tempHabits.filter(h => {
                    const log = habitLogs?.find(l => l.habitId === h.id && l.date === today);
                    return !!log;
                });
                break;
            case 'All Habits':
                tempHabits = tempHabits.filter(h => h.origin !== 'system-islamic');
                break;
            default:
                tempHabits = tempHabits.filter(h => h.origin !== 'system-islamic');
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            tempHabits = tempHabits.filter(h => h.name.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q));
        }

        return tempHabits.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }, [allHabits, searchQuery, habitLogs]);

    const renderTabContent = () => {
        const habits = getFilteredHabits(activeTab);

        return (
            <div className="mt-6">
                {habits.length === 0 ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center space-y-4">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10">
                                <EmptyIcon className="text-5xl text-accent" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-text-primary mb-2">No habits yet</h2>
                                <p className="text-text-secondary mb-6 max-w-sm">Start building better habits today. Create your first habit to begin your journey.</p>
                            </div>
                            <button onClick={handleNewHabit} className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-all duration-200 font-medium">
                                <AddIcon className="text-lg" />
                                Create Your First Habit
                            </button>
                        </div>
                    </div>
                ) : viewStyle === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-5">
                        {habits.map(habit => (
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
                    <div className="space-y-3 max-w-5xl mx-auto">
                        {habits.map(habit => (
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
        );
    };

    return (
        <div className="space-y-8 animate-fade-in relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
                <h1 className="text-4xl font-bold text-text-primary">Habits</h1>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => setViewStyle('grid')}
                        title="Grid view"
                        className={`p-2 rounded-md ${viewStyle === 'grid' ? 'bg-accent text-white' : 'bg-tertiary text-text-secondary hover:bg-opacity-80'}`}
                    >
                        <GridViewIcon className="text-xl" />
                    </button>
                    <button
                        onClick={() => setViewStyle('list')}
                        title="List view"
                        className={`p-2 rounded-md ${viewStyle === 'list' ? 'bg-accent text-white' : 'bg-tertiary text-text-secondary hover:bg-opacity-80'}`}
                    >
                        <ListViewIcon className="text-xl" />
                    </button>
                    <button
                        onClick={handleNewHabit}
                        className="bg-accent hover:bg-accent-hover text-white font-bold py-3 px-5 rounded-lg text-sm shadow-md transition-transform transform hover:scale-105"
                    >
                        + New Habit
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-tertiary">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {renderTabContent()}

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
                                completed: true,
                                createdAt: new Date(),
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
    selectedFolderId: number | null; setSelectedFolderId: (id: number | null) => void;
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
        <div className={`w-72 md:w-80 lg:w-[320px] bg-secondary border-r border-tertiary flex flex-col transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 fixed inset-y-0 left-0 z-30 ${props.isHabitsSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
                        selectedFolderId={props.selectedFolderId}
                        setSelectedFolderId={props.setSelectedFolderId}
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
                completed: true,
                createdAt: new Date(),
            });
        }
    };

    return (
        <div
            onClick={(e) => {
                // Only trigger select if clicking on the card itself, not on buttons
                if ((e.target as HTMLElement).closest('button')) return;
                onSelect();
            }}
            className={`bg-secondary border-2 rounded-2xl p-4 md:p-5 cursor-pointer transition-all duration-300 hover:shadow-lg ${isSelected ? 'border-accent bg-accent/10 shadow-lg' : 'border-tertiary hover:border-accent/50 hover:shadow-md'}`}
        >
            {/* Header with title and actions */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
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
                completed: true,
                createdAt: new Date(),
            });
        }
    };

    return (
        <div
            onClick={(e) => {
                // Only trigger select if clicking on the card itself, not on buttons
                if ((e.target as HTMLElement).closest('button')) return;
                onSelect();
            }}
            className={`bg-secondary border-2 rounded-2xl p-4 cursor-pointer transition-all duration-300 flex items-center justify-between hover:shadow-md ${isSelected ? 'border-accent bg-accent/10 shadow-md' : 'border-tertiary hover:border-accent/50'}`}
        >
            <div className="flex-1 min-w-0 flex items-center gap-4 cursor-pointer" onClick={onSelect}>
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
    selectedFolderId: number | null; setSelectedFolderId: (id: number | null) => void;
    onNewHabit: (folderId?: number) => void; onEditHabit?: (habit: Habit) => void; renamingHabitId: number | null; setRenamingHabitId: (id: number | null) => void;
    onRenameHabit: (habit: Habit, newName: string) => void;
    expandedFolders: Set<number>; toggleFolder: (folderId: number) => void;
    renamingFolderId: number | null; setRenamingFolderId: (id: number | null) => void;
    onNewFolder: (parentId: number | null) => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
    setAlertModal: (modal: { isOpen: boolean; title: string; message: string; icon?: string } | null) => void;
}> = (props) => {
    const { habitFolders, habits, parentId = null, level = 0, selectedHabitId, setSelectedHabitId, selectedFolderId, setSelectedFolderId, onNewHabit, onEditHabit, renamingHabitId, setRenamingHabitId, onRenameHabit, expandedFolders, toggleFolder, renamingFolderId, setRenamingFolderId, onNewFolder } = props;

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
                            <button
                                onClick={() => {
                                    toggleFolder(folder.id!);
                                    setSelectedFolderId(folder.id!);
                                }}
                                title={expandedFolders.has(folder.id!) ? 'Collapse folder' : 'Expand folder'}
                                className={`flex-1 flex items-center p-1 rounded-md text-text-primary hover:bg-tertiary ${selectedFolderId === folder.id ? 'bg-accent/20' : ''}`}
                            >
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

// Heatmap Component
const HabitHeatmap: React.FC<{ habitId: number; habitLogs?: HabitLog[]; habitCreatedAt?: Date | string }> = ({ habitId, habitLogs, habitCreatedAt }) => {
    const [timeRange, setTimeRange] = useState<number>(90);

    const heatmapData = useMemo(() => {
        const today = new Date();
        const createdDate = habitCreatedAt ? new Date(habitCreatedAt) : null;
        const data: { date: string; count: number }[] = [];

        // Calculate days since creation
        const daysSinceCreation = createdDate
            ? Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
            : timeRange;

        // Use the minimum of selected range and days since creation
        const actualRange = Math.min(timeRange, daysSinceCreation);

        // Generate last N days based on actual range
        for (let i = actualRange - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const hasLog = habitLogs?.some(log => log.habitId === habitId && log.date === dateStr);
            data.push({ date: dateStr, count: hasLog ? 1 : 0 });
        }

        return data;
    }, [habitId, habitLogs, timeRange, habitCreatedAt]);

    // Group by weeks
    const weeks = useMemo(() => {
        const result: { date: string; count: number }[][] = [];
        for (let i = 0; i < heatmapData.length; i += 7) {
            result.push(heatmapData.slice(i, i + 7));
        }
        return result;
    }, [heatmapData]);

    // Calculate stats
    const stats = useMemo(() => {
        const completed = heatmapData.filter(d => d.count > 0).length;
        const total = heatmapData.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { completed, total, percentage };
    }, [heatmapData]);

    const timeRangeOptions = [
        { value: 15, label: '15 Days' },
        { value: 30, label: '30 Days' },
        { value: 60, label: '60 Days' },
        { value: 90, label: '90 Days' },
        { value: 180, label: '6 Months' },
        { value: 365, label: '1 Year' },
    ];

    return (
        <div className="bg-primary rounded-lg p-4 border border-tertiary">
            {/* Header with time range selector */}
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <div className="text-sm text-text-secondary">
                    <span className="font-semibold text-accent">{stats.completed}</span> of {stats.total} days ({stats.percentage}%)
                </div>
                <div className="flex gap-1 flex-wrap">
                    {timeRangeOptions.map(option => (
                        <button
                            key={option.value}
                            onClick={() => setTimeRange(option.value)}
                            className={`px-2.5 py-1 text-xs rounded-lg transition-all duration-200 font-medium ${
                                timeRange === option.value
                                    ? 'bg-accent text-white'
                                    : 'bg-tertiary text-text-secondary hover:bg-tertiary/70'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Heatmap grid */}
            <div className="overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                    {weeks.map((week, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-1">
                            {week.map((day) => {
                                return (
                                    <div
                                        key={day.date}
                                        title={`${day.date} - ${day.count > 0 ? 'Completed' : 'Not completed'}`}
                                        className={`w-4 h-4 rounded-sm transition-all duration-200 hover:scale-125 cursor-pointer ${
                                            day.count > 0
                                                ? 'bg-green-500 hover:bg-green-400'
                                                : 'bg-tertiary hover:bg-tertiary/70'
                                        }`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 text-xs text-text-secondary">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="w-4 h-4 bg-tertiary rounded-sm" />
                    <div className="w-4 h-4 bg-green-500/30 rounded-sm" />
                    <div className="w-4 h-4 bg-green-500/60 rounded-sm" />
                    <div className="w-4 h-4 bg-green-500 rounded-sm" />
                </div>
                <span>More</span>
            </div>
        </div>
    );
};

const HabitDetailPanel: React.FC<{
    habit: Habit | null;
    streak: number;
    isCompleted: boolean;
    habitLogs?: HabitLog[];
    onClose: () => void;
    onEdit: () => void;
    onToggleCompletion: () => void;
}> = ({ habit, streak, isCompleted, habitLogs, onClose, onEdit, onToggleCompletion }) => {
    const [isToggling, setIsToggling] = useState(false);

    if (!habit) return null;

    const today = getTodayDateString();

    // Calculate completion rate based on days since creation
    const completionRate = useMemo(() => {
        if (!habit.createdAt) return 0;

        const createdDate = new Date(habit.createdAt);
        const todayDate = new Date();
        const daysSinceCreation = Math.floor((todayDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // Count completed days
        const completedDays = habitLogs?.filter(l => l.habitId === habit.id).length ?? 0;

        // Calculate percentage
        return daysSinceCreation > 0 ? Math.round((completedDays / daysSinceCreation) * 100) : 0;
    }, [habit.id, habit.createdAt, habitLogs]);

    const handleToggleCompletion = async () => {
        setIsToggling(true);
        try {
            await onToggleCompletion();
        } finally {
            setIsToggling(false);
        }
    };

    const handleEdit = () => {
        onEdit();
        // Close detail panel after a short delay to allow modal to open
        setTimeout(() => onClose(), 100);
    };

    return (
        <>
            {/* Modal Overlay */}
            <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4" onClick={onClose}>
                {/* Modal Box */}
                <div
                    className="bg-secondary rounded-2xl shadow-2xl z-50 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
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
                            <p className="text-2xl font-bold text-text-primary">{completionRate}%</p>
                        </div>
                    </div>

                    {/* Heatmap */}
                    <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                            <CalendarIcon className="text-lg" /> Activity Heatmap
                        </h4>
                        <HabitHeatmap habitId={habit.id!} habitLogs={habitLogs} habitCreatedAt={habit.createdAt} />
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
                </div>

                {/* Footer Actions */}
                <div className="border-t border-tertiary p-4 md:p-6 space-y-3">
                    {habit.isActive && (
                        <button
                            onClick={handleToggleCompletion}
                            disabled={isToggling}
                            className={`w-full py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                isCompleted
                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                    : 'bg-accent text-white hover:bg-accent/90'
                            }`}
                        >
                            {isToggling ? 'Updating...' : (isCompleted ? '✓ Completed Today' : 'Mark as Complete')}
                        </button>
                    )}
                    <button
                        onClick={handleEdit}
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
                xp,
                isActive,
                folderId,
                updatedAt: new Date(),
            });
            onClose();
        } catch (error) {
            console.error('Error saving habit:', error);
        }
    }, [name, description, frequency, daysOfWeek, xp, isActive, folderId, habit, onSave, onClose]);

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

