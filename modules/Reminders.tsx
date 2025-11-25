import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { Reminder, ReminderFolder } from '../types';
import { remindersService, reminderFoldersService } from '../services/dataService';
import ConfirmModal from '../components/modals/ConfirmModal';
import AlertModal from '../components/modals/AlertModal';

type ReminderFilter = 'all' | 'pending' | 'completed' | 'overdue';

// --- ICONS ---
const MenuIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>menu</span>;
const BellIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>notifications</span>;
const CheckCircleIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>check_circle</span>;
const ClockIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>schedule</span>;
const AlertIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>error</span>;
const MoreVertIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>more_vert</span>;
const DeleteIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>delete</span>;
const AddIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>add</span>;
const FolderIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>folder</span>;
const FolderPlusIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>create_new_folder</span>;
const ChevronRightIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>chevron_right</span>;
const PencilIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>note_add</span>;
const MoveIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>drive_file_move</span>;
const PaletteIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>palette</span>;
const TrashIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>delete</span>;
const BookIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>menu_book</span>;
const ProjectIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>view_kanban</span>;
const BrainIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>psychology</span>;
const HeartIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>favorite</span>;
const BriefcaseIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>work</span>;
const SchoolIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>school</span>;
const HomeIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>home</span>;
const GridViewIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>grid_view</span>;
const ListViewIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>list</span>;
const ImageIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>image</span>;
const LocationIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>location_on</span>;
const FormatListIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>format_list_bulleted</span>;

const Reminders: React.FC = () => {
    const allReminders = useSupabaseQuery<Reminder>('reminders');
    const reminderFolders = useSupabaseQuery<ReminderFolder>('reminder_folders');

    const [selectedReminderId, setSelectedReminderId] = useState<number | null>(null);
    const [reminderFilter, setReminderFilter] = useState<ReminderFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isRemindersSidebarOpen, setIsRemindersSidebarOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null>(null);
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; icon?: string } | null>(null);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [viewStyle, setViewStyle] = useState<'grid' | 'list'>('grid');

    // Update overdue status
    useMemo(() => {
        if (!allReminders) return;
        const now = new Date();
        allReminders.forEach(async (reminder) => {
            if (reminder.status === 'pending' && new Date(reminder.dueDate) < now) {
                await remindersService.update(reminder.id!, { status: 'overdue' });
            }
        });
    }, [allReminders]);

    const selectedReminder = useMemo(() => {
        const reminder = allReminders?.find(r => r.id === selectedReminderId);
        if (reminder) return reminder;
        if (selectedReminderId) setSelectedReminderId(null);
        return null;
    }, [allReminders, selectedReminderId]);

    const handleNewReminder = (folderId?: number) => {
        // Open edit modal with empty reminder
        const newReminder: Reminder = {
            title: 'Untitled Reminder',
            description: '',
            dueDate: new Date().toISOString(),
            dueTime: '',
            priority: 'medium',
            category: 'personal',
            status: 'pending',
            recurring: 'none',
            notificationEnabled: true,
            notificationTime: 9,
            folderId: folderId || null,
        };
        setEditingReminder(newReminder);
        setIsEditModalOpen(true);
    };

    const handleSelectReminder = (id: number | null) => {
        setSelectedReminderId(id);
        setIsRemindersSidebarOpen(false);
    };

    const handleSaveReminder = async (reminder: Reminder) => {
        try {
            if (reminder.id) {
                // Update existing reminder
                await remindersService.update(reminder.id, reminder);
            } else {
                // Create new reminder
                const newReminder = await remindersService.create(reminder);
                if (newReminder && newReminder.id) {
                    setReminderFilter('all');
                    handleSelectReminder(newReminder.id);
                }
            }
        } catch (error) {
            console.error('Error saving reminder:', error);
            setAlertModal({
                isOpen: true,
                title: 'Error',
                message: `Failed to save reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
                icon: '⚠️'
            });
        }
    };

    const displayReminders = useMemo(() => {
        let tempReminders = allReminders ?? [];
        switch(reminderFilter) {
            case 'pending': tempReminders = tempReminders.filter(r => r.status === 'pending'); break;
            case 'completed': tempReminders = tempReminders.filter(r => r.status === 'completed'); break;
            case 'overdue': tempReminders = tempReminders.filter(r => r.status === 'overdue'); break;
            default: tempReminders = tempReminders.filter(r => r.status !== 'completed');
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            tempReminders = tempReminders.filter(r => r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
        }
        return tempReminders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }, [allReminders, reminderFilter, searchQuery]);

    return (
        <div className="flex h-full bg-primary font-sans relative overflow-hidden">
            {isRemindersSidebarOpen && (
                <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setIsRemindersSidebarOpen(false)} />
            )}
            <Sidebar
                reminderFolders={reminderFolders}
                reminders={allReminders}
                reminderFilter={reminderFilter}
                setReminderFilter={setReminderFilter}
                selectedReminderId={selectedReminderId}
                setSelectedReminderId={handleSelectReminder}
                onNewReminder={handleNewReminder}
                onEditReminder={(reminder) => {
                    setEditingReminder(reminder);
                    setIsEditModalOpen(true);
                }}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isRemindersSidebarOpen={isRemindersSidebarOpen}
                setConfirmModal={setConfirmModal}
                setAlertModal={setAlertModal}
            />
            <main className="flex-1 flex flex-col min-w-0 bg-primary">
                <div className="p-4 border-b border-tertiary flex-shrink-0 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsRemindersSidebarOpen(true)} title="Toggle sidebar" className="md:hidden p-2 rounded-md text-text-primary bg-secondary border border-tertiary">
                            <MenuIcon className="text-2xl" />
                        </button>
                        <h1 className="text-2xl font-bold">Reminders</h1>
                    </div>
                    <div className="flex items-center gap-2">
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

                <div className="flex-1 overflow-y-auto p-6">
                    {displayReminders.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-text-muted">
                            <div className="text-center">
                                <BellIcon className="text-6xl mx-auto text-tertiary mb-4" />
                                <h2 className="text-xl font-semibold">No reminders found</h2>
                                <p className="text-text-secondary mb-4">Create a new reminder to get started</p>
                                <button onClick={() => handleNewReminder()} className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90">
                                    Create Reminder
                                </button>
                            </div>
                        </div>
                    ) : viewStyle === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {displayReminders.map(reminder => (
                                <ReminderCard
                                    key={reminder.id}
                                    reminder={reminder}
                                    isSelected={selectedReminderId === reminder.id}
                                    onSelect={() => handleSelectReminder(reminder.id!)}
                                    onEdit={() => {
                                        setEditingReminder(reminder);
                                        setIsEditModalOpen(true);
                                    }}
                                    setConfirmModal={setConfirmModal}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {displayReminders.map(reminder => (
                                <ReminderListItem
                                    key={reminder.id}
                                    reminder={reminder}
                                    isSelected={selectedReminderId === reminder.id}
                                    onSelect={() => handleSelectReminder(reminder.id!)}
                                    onEdit={() => {
                                        setEditingReminder(reminder);
                                        setIsEditModalOpen(true);
                                    }}
                                    setConfirmModal={setConfirmModal}
                                />
                            ))}
                        </div>
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
            {alertModal && (
                <AlertModal
                    isOpen={alertModal.isOpen}
                    title={alertModal.title}
                    message={alertModal.message}
                    icon={alertModal.icon || "⚠️"}
                    onClose={() => setAlertModal(null)}
                />
            )}
            {editingReminder && (
                <ReminderEditModal
                    reminder={editingReminder}
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingReminder(null);
                    }}
                    onSave={handleSaveReminder}
                    reminderFolders={reminderFolders}
                />
            )}
        </div>
    );
};

const Sidebar: React.FC<{
    reminderFolders?: ReminderFolder[]; reminders?: Reminder[]; reminderFilter: ReminderFilter; setReminderFilter: (f: ReminderFilter) => void;
    selectedReminderId: number | null; setSelectedReminderId: (id: number | null) => void;
    onNewReminder: (folderId?: number) => void; onEditReminder?: (reminder: Reminder) => void;
    searchQuery: string; setSearchQuery: (q: string) => void;
    isRemindersSidebarOpen: boolean;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
    setAlertModal: (modal: { isOpen: boolean; title: string; message: string; icon?: string } | null) => void;
}> = (props) => {
    const [renamingReminderId, setRenamingReminderId] = useState<number|null>(null);
    const [movingReminder, setMovingReminder] = useState<Reminder|null>(null);
    const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

    const filteredReminders = useMemo(() => {
        let tempReminders = props.reminders ?? [];
        switch(props.reminderFilter) {
            case 'pending': tempReminders = tempReminders.filter(r => r.status === 'pending'); break;
            case 'completed': tempReminders = tempReminders.filter(r => r.status === 'completed'); break;
            case 'overdue': tempReminders = tempReminders.filter(r => r.status === 'overdue'); break;
            default: tempReminders = tempReminders.filter(r => r.status !== 'completed');
        }
        if (props.searchQuery) {
            const q = props.searchQuery.toLowerCase();
            tempReminders = tempReminders.filter(r => r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
        }
        return tempReminders;
    }, [props.reminders, props.reminderFilter, props.searchQuery]);

    const handleRenameReminder = async (reminder: Reminder, newName: string) => {
        if (renamingReminderId !== reminder.id) return;
        setRenamingReminderId(null);
        if (newName.trim() && newName.trim() !== reminder.title) {
            await remindersService.update(reminder.id!, { title: newName.trim(), updatedAt: new Date() });
        }
    };

    const handleNewFolder = async (parentId: number | null = null) => {
        const newFolder = await reminderFoldersService.create({
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

    const isFilterActive = props.searchQuery.length > 0 || props.reminderFilter !== 'all';

    return (
        <div className={`w-72 md:w-80 bg-secondary border-r border-tertiary flex flex-col transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 fixed inset-y-0 left-0 z-30 ${props.isRemindersSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-3 flex-shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Reminders</h1>
                    <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNewFolder(null); }} title="New Folder" className="p-2 rounded-md hover:bg-tertiary text-text-primary">
                            <FolderPlusIcon className="text-xl" />
                        </button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.onNewReminder(); }} title="New Reminder" className="p-2 rounded-md hover:bg-tertiary text-text-primary">
                            <PencilIcon className="text-xl" />
                        </button>
                    </div>
                </div>
                <input type="text" placeholder="Search reminders..." value={props.searchQuery} onChange={e => props.setSearchQuery(e.target.value)}
                    className="w-full bg-primary border border-tertiary rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
            <div className="px-3 pb-2 space-y-1 border-b border-tertiary">
                <NavItem icon={<BellIcon className="text-xl"/>} label="All Reminders" isActive={props.reminderFilter === 'all'} onClick={() => props.setReminderFilter('all')} />
                <NavItem icon={<ClockIcon className="text-xl"/>} label="Pending" isActive={props.reminderFilter === 'pending'} onClick={() => props.setReminderFilter('pending')} />
                <NavItem icon={<CheckCircleIcon className="text-xl"/>} label="Completed" isActive={props.reminderFilter === 'completed'} onClick={() => props.setReminderFilter('completed')} />
                <NavItem icon={<AlertIcon className="text-xl"/>} label="Overdue" isActive={props.reminderFilter === 'overdue'} onClick={() => props.setReminderFilter('overdue')} />
            </div>
            <div className="flex-1 overflow-y-auto p-3">
                {isFilterActive ? (
                    <div className="space-y-1">
                        <h2 className="px-2 text-sm font-semibold text-text-secondary mb-2">{filteredReminders.length} Result(s)</h2>
                        {filteredReminders.map(reminder => (
                            <ReminderItem
                                key={reminder.id}
                                reminder={reminder}
                                isSelected={props.selectedReminderId === reminder.id}
                                isRenaming={renamingReminderId === reminder.id}
                                onSelect={() => props.setSelectedReminderId(reminder.id!)}
                                onEdit={() => props.onEditReminder?.(reminder)}
                                onRename={handleRenameReminder}
                                onStartRename={() => setRenamingReminderId(reminder.id!)}
                                onCancelRename={() => setRenamingReminderId(null)}
                                onMove={() => setMovingReminder(reminder)}
                                setConfirmModal={props.setConfirmModal}
                            />
                        ))}
                    </div>
                ) : (
                    <FolderTree
                        reminderFolders={props.reminderFolders}
                        reminders={props.reminders}
                        selectedReminderId={props.selectedReminderId}
                        setSelectedReminderId={props.setSelectedReminderId}
                        onNewReminder={props.onNewReminder}
                        onEditReminder={props.onEditReminder}
                        renamingReminderId={renamingReminderId}
                        setRenamingReminderId={setRenamingReminderId}
                        onRenameReminder={handleRenameReminder}
                        onMoveReminder={(reminder) => setMovingReminder(reminder)}
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
            {movingReminder && <MoveReminderModal reminder={movingReminder} reminderFolders={props.reminderFolders} onClose={() => setMovingReminder(null)} />}
        </div>
    );
};

const NavItem: React.FC<{ icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }> = ({ icon, label, isActive, onClick }) => (
    <button onClick={onClick} title={`Show ${label}`} className={`w-full flex items-center space-x-3 px-2 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-accent/30 text-accent' : 'text-text-primary hover:bg-tertiary'}`}>
        {icon}
        <span>{label}</span>
    </button>
);

const ReminderCard: React.FC<{
    reminder: Reminder;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({ reminder, isSelected, onSelect, onEdit, setConfirmModal }) => {
    const [showMenu, setShowMenu] = useState(false);
    const priorityColors = { high: 'bg-red-500/20 text-red-400', medium: 'bg-yellow-500/20 text-yellow-400', low: 'bg-green-500/20 text-green-400' };
    const statusColors = { pending: 'bg-blue-500/20 text-blue-400', overdue: 'bg-red-500/20 text-red-400', completed: 'bg-green-500/20 text-green-400' };

    const handleDelete = async () => {
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

    const handleToggleComplete = async () => {
        const newStatus = reminder.status === 'completed' ? 'pending' : 'completed';
        await remindersService.update(reminder.id!, {
            status: newStatus,
            completedAt: newStatus === 'completed' ? new Date() : undefined,
        });
    };

    return (
        <div onClick={onSelect} className={`bg-secondary border-2 rounded-lg p-4 cursor-pointer transition-all ${isSelected ? 'border-accent bg-accent/10' : 'border-tertiary hover:border-accent/50'}`}>
            <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className={`font-semibold flex-1 ${reminder.status === 'completed' ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                    {reminder.title}
                </h3>
                <div className="relative flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="p-1 hover:bg-tertiary rounded">
                        <MoreVertIcon className="text-lg" />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-tertiary border border-primary rounded-lg shadow-lg z-50 w-40">
                            <button onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-white flex items-center gap-2">
                                <PencilIcon className="text-lg" /> Edit
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleToggleComplete(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-white flex items-center gap-2">
                                <CheckCircleIcon className="text-lg" /> {reminder.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-red-500/20 text-red-400 flex items-center gap-2">
                                <TrashIcon className="text-lg" /> Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {reminder.description && (
                <p className="text-sm text-text-secondary mb-3 line-clamp-2">{reminder.description}</p>
            )}

            <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-2 py-1 rounded ${priorityColors[reminder.priority as keyof typeof priorityColors]}`}>
                    {reminder.priority}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${statusColors[reminder.status as keyof typeof statusColors]}`}>
                    {reminder.status}
                </span>
                {reminder.dueDate && (
                    <span className="text-xs px-2 py-1 rounded bg-tertiary text-text-secondary">
                        {new Date(reminder.dueDate).toLocaleDateString()}
                    </span>
                )}
            </div>
        </div>
    );
};

const ReminderListItem: React.FC<{
    reminder: Reminder;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({ reminder, isSelected, onSelect, onEdit, setConfirmModal }) => {
    const [showMenu, setShowMenu] = useState(false);
    const priorityColors = { high: 'text-red-400', medium: 'text-yellow-400', low: 'text-green-400' };
    const statusColors = { pending: 'text-blue-400', overdue: 'text-red-400', completed: 'text-green-400' };

    const handleDelete = async () => {
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

    const handleToggleComplete = async () => {
        const newStatus = reminder.status === 'completed' ? 'pending' : 'completed';
        await remindersService.update(reminder.id!, {
            status: newStatus,
            completedAt: newStatus === 'completed' ? new Date() : undefined,
        });
    };

    return (
        <div onClick={onSelect} className={`bg-secondary border rounded-lg p-3 cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'border-accent bg-accent/10' : 'border-tertiary hover:border-accent/50'}`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <h3 className={`font-medium flex-1 truncate ${reminder.status === 'completed' ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                        {reminder.title}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${priorityColors[reminder.priority as keyof typeof priorityColors]}`}>
                        {reminder.priority}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${statusColors[reminder.status as keyof typeof statusColors]}`}>
                        {reminder.status}
                    </span>
                </div>
                {reminder.description && (
                    <p className="text-xs text-text-secondary mt-1 truncate">{reminder.description}</p>
                )}
            </div>
            <div className="relative flex-shrink-0 ml-2">
                <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="p-1 hover:bg-tertiary rounded">
                    <MoreVertIcon className="text-lg" />
                </button>
                {showMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-tertiary border border-primary rounded-lg shadow-lg z-50 w-40">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-white flex items-center gap-2">
                            <PencilIcon className="text-lg" /> Edit
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleToggleComplete(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-white flex items-center gap-2">
                            <CheckCircleIcon className="text-lg" /> {reminder.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-red-500/20 text-red-400 flex items-center gap-2">
                            <TrashIcon className="text-lg" /> Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const FolderTree: React.FC<{
    reminderFolders?: ReminderFolder[]; reminders?: Reminder[]; parentId?: number | null; level?: number;
    selectedReminderId: number | null; setSelectedReminderId: (id: number | null) => void;
    onNewReminder: (folderId?: number) => void; onEditReminder?: (reminder: Reminder) => void; renamingReminderId: number | null; setRenamingReminderId: (id: number | null) => void;
    onRenameReminder: (reminder: Reminder, newName: string) => void; onMoveReminder: (reminder: Reminder) => void;
    expandedFolders: Set<number>; toggleFolder: (folderId: number) => void;
    renamingFolderId: number | null; setRenamingFolderId: (id: number | null) => void;
    onNewFolder: (parentId: number | null) => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
    setAlertModal: (modal: { isOpen: boolean; title: string; message: string; icon?: string } | null) => void;
}> = (props) => {
    const { reminderFolders, reminders, parentId = null, level = 0, selectedReminderId, setSelectedReminderId, onNewReminder, onEditReminder, renamingReminderId, setRenamingReminderId, onRenameReminder, onMoveReminder, expandedFolders, toggleFolder, renamingFolderId, setRenamingFolderId, onNewFolder } = props;

    const [customizingFolder, setCustomizingFolder] = useState<ReminderFolder|null>(null);

    const childFolders = useMemo(() => reminderFolders?.filter(f => f.parentId === parentId) ?? [], [reminderFolders, parentId]);
    const childReminders = useMemo(() => reminders?.filter(r => r.folderId === (parentId || undefined) && r.status !== 'completed').sort((a,b) => a.title.localeCompare(b.title)) ?? [], [reminders, parentId]);

    const handleRenameFolder = async (folder: ReminderFolder, newName: string) => {
        if (renamingFolderId !== folder.id) return;
        setRenamingFolderId(null);
        if(newName.trim() && newName.trim() !== folder.name) {
            await reminderFoldersService.update(folder.id!, { name: newName.trim() });
        }
    }

    const handleDeleteFolder = async (folder: ReminderFolder) => {
        const childRemindersCount = (props.reminders?.filter(r => r.folderId === folder.id) || []).length;
        const childFoldersCount = (props.reminderFolders?.filter(f => f.parentId === folder.id) || []).length;
        if (childRemindersCount > 0 || childFoldersCount > 0) {
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
                await reminderFoldersService.delete(folder.id!);
                props.setConfirmModal(null);
            }
        });
    };

    const FOLDER_ICONS: { [key: string]: React.ComponentType<{ className?: string }> } = {
        default: FolderIcon, book: BookIcon, project: ProjectIcon, knowledge: BrainIcon, personal: HeartIcon, work: BriefcaseIcon, studies: SchoolIcon, home: HomeIcon,
    };
    const COLOR_CLASSES: { [key: string]: string } = {
        accent: 'text-accent', red: 'text-red-400', orange: 'text-orange-400', yellow: 'text-yellow-400', green: 'text-green-400', teal: 'text-teal-400', blue: 'text-blue-400', indigo: 'text-indigo-400', purple: 'text-purple-400', pink: 'text-pink-400', gray: 'text-gray-400'
    };

    const FolderDisplayIcon = ({ folder }: { folder: ReminderFolder }) => {
        const Icon = FOLDER_ICONS[folder.icon || 'default'] || FolderIcon;
        return <Icon className={`text-lg mr-2 ${COLOR_CLASSES[folder.color || 'default'] || 'text-text-secondary'}`} />;
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
                                <FolderDisplayIcon folder={folder} />
                                <span className="truncate">{folder.name}</span>
                            </button>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <FolderActions folder={folder} onNewReminder={() => onNewReminder(folder.id)} onNewSubfolder={() => onNewFolder(folder.id!)} onRename={() => setRenamingFolderId(folder.id!)} onDelete={() => handleDeleteFolder(folder)} onCustomize={() => setCustomizingFolder(folder)} />
                            </div>
                        </div>
                    )}
                    {expandedFolders.has(folder.id!) && (
                        <FolderTree {...props} parentId={folder.id} level={level + 1} />
                    )}
                </div>
            ))}

            <div className="border-l border-tertiary/50" style={{ marginLeft: '7px' }}>
                {childReminders.map(reminder => (
                    <ReminderItem key={reminder.id} reminder={reminder} level={level} isSelected={selectedReminderId === reminder.id} isRenaming={renamingReminderId === reminder.id} onSelect={() => setSelectedReminderId(reminder.id!)} onEdit={() => { props.onEditReminder?.(reminder); }} onRename={onRenameReminder} onStartRename={() => setRenamingReminderId(reminder.id!)} onCancelRename={()=> setRenamingReminderId(null)} onMove={() => onMoveReminder(reminder)} setConfirmModal={props.setConfirmModal} />
                ))}
            </div>
            {customizingFolder && <FolderCustomizationModal folder={customizingFolder} onClose={() => setCustomizingFolder(null)} icons={FOLDER_ICONS} colors={COLOR_CLASSES} />}
        </div>
    );
};

const ReminderItem: React.FC<{
    reminder: Reminder; level?: number; isSelected: boolean; isRenaming: boolean;
    onSelect: () => void; onEdit: () => void; onRename: (reminder: Reminder, newName: string) => void;
    onStartRename: () => void; onCancelRename: () => void; onMove: () => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({ reminder, level=0, isSelected, isRenaming, onSelect, onEdit, onRename, onStartRename, onCancelRename, onMove, setConfirmModal }) => {
    if (isRenaming) {
        return (
            <div style={{ paddingLeft: `${(level * 16) + 16}px`}} className="py-1">
                <input type="text" defaultValue={reminder.title} autoFocus
                    onBlur={(e) => onRename(reminder, e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onRename(reminder, e.currentTarget.value);
                        if (e.key === 'Escape') onCancelRename();
                    }}
                    className="w-full bg-primary border border-accent rounded-md py-1 px-2 text-sm"
                />
            </div>
        )
    }
    return (
        <div className="w-full text-left flex items-center pr-1 rounded-md text-sm group" style={{ paddingLeft: `${level * 16}px`}}>
            <button onClick={onSelect} title={reminder.title} className={`flex-1 flex items-center p-1 rounded-md truncate ${isSelected ? 'bg-accent/30' : 'hover:bg-tertiary'}`}>
                <BellIcon className={`text-lg mr-2 flex-shrink-0 ${isSelected ? 'text-accent' : 'text-text-secondary'}`} />
                <span className={`truncate ${isSelected ? 'text-accent' : 'text-text-primary'}`}>{reminder.title}</span>
            </button>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ReminderActions reminder={reminder} onEdit={onEdit} onMove={onMove} onRename={onStartRename} setConfirmModal={setConfirmModal} />
            </div>
        </div>
    )
}

const EditorPanel: React.FC<{
    reminder: Reminder;
    toggleSidebar: () => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({ reminder: initialReminder, toggleSidebar, setConfirmModal }) => {
    const [title, setTitle] = useState(initialReminder.title);
    const [description, setDescription] = useState(initialReminder.description || '');
    const [dueDate, setDueDate] = useState(initialReminder.dueDate instanceof Date ? initialReminder.dueDate.toISOString().split('T')[0] : '');
    const [dueTime, setDueTime] = useState(initialReminder.dueTime || '');
    const [priority, setPriority] = useState(initialReminder.priority);
    const [category, setCategory] = useState(initialReminder.category);
    const [recurring, setRecurring] = useState(initialReminder.recurring || 'none');
    const [notificationEnabled, setNotificationEnabled] = useState(initialReminder.notificationEnabled ?? true);
    const [notificationTime, setNotificationTime] = useState(initialReminder.notificationTime || 15);

    const handleSave = useCallback(async () => {
        if (!title.trim()) return;
        await remindersService.update(initialReminder.id!, {
            title,
            description,
            dueDate: new Date(dueDate),
            dueTime,
            priority: priority as 'low' | 'medium' | 'high',
            category,
            recurring,
            notificationEnabled,
            notificationTime,
            updatedAt: new Date(),
        });
    }, [title, description, dueDate, dueTime, priority, category, recurring, notificationEnabled, notificationTime, initialReminder]);

    useEffect(() => {
        const handler = setTimeout(() => {
            handleSave();
        }, 1000);
        return () => clearTimeout(handler);
    }, [title, description, dueDate, dueTime, priority, category, recurring, notificationEnabled, notificationTime, handleSave]);

    const handleToggleComplete = async () => {
        const newStatus = initialReminder.status === 'completed' ? 'pending' : 'completed';
        await remindersService.update(initialReminder.id!, {
            status: newStatus,
            completedAt: newStatus === 'completed' ? new Date() : undefined,
        });
    };

    const handleDelete = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Reminder',
            message: `Are you sure you want to delete "${initialReminder.title}"?`,
            icon: '🗑️',
            onConfirm: async () => {
                await remindersService.delete(initialReminder.id!);
                setConfirmModal(null);
            }
        });
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-primary">
            <div className="p-3 border-b border-tertiary flex-shrink-0 flex items-center justify-between gap-2">
                <button onClick={toggleSidebar} title="Toggle sidebar" className="p-2 -ml-2 rounded-lg text-text-muted hover:bg-tertiary md:hidden">
                    <MenuIcon className="text-2xl" />
                </button>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    className={`w-full bg-transparent text-2xl font-bold focus:outline-none text-text-primary`} />
                <div className="flex items-center space-x-2">
                    <button onClick={handleToggleComplete} title={initialReminder.status === 'completed' ? "Mark as pending" : "Mark as completed"} className={`p-2 rounded-lg text-text-muted hover:bg-tertiary ${initialReminder.status === 'completed' ? 'text-accent' : ''}`}>
                        <CheckCircleIcon className="text-xl"/>
                    </button>
                    <button onClick={handleDelete} title="Delete reminder" className="p-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-tertiary">
                        <TrashIcon className="text-xl"/>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
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
                            onChange={e => setDueDate(e.target.value)}
                            className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Time</label>
                        <input
                            type="time"
                            value={dueTime}
                            onChange={e => setDueTime(e.target.value)}
                            className="w-full bg-primary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Priority</label>
                        <select
                            value={priority}
                            onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high')}
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
                            onChange={e => setCategory(e.target.value)}
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
                        onChange={e => setRecurring(e.target.value)}
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
                            onChange={e => setNotificationEnabled(e.target.checked)}
                            className="w-4 h-4 rounded border-tertiary"
                        />
                        <span className="text-sm font-medium text-text-primary">Enable Notification</span>
                    </label>
                    {notificationEnabled && (
                        <select
                            value={notificationTime}
                            onChange={e => setNotificationTime(parseInt(e.target.value))}
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

// --- MODALS & ACTION COMPONENTS ---
const DropdownMenu: React.FC<{ trigger: React.ReactNode, children: React.ReactNode }> = ({ trigger, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <div onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>{trigger}</div>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-tertiary rounded-md shadow-lg z-10 border border-primary" onClick={() => setIsOpen(false)}>
                    <div className="py-1">{children}</div>
                </div>
            )}
        </div>
    );
};

const DropdownMenuItem: React.FC<{ icon: React.ReactNode; children: React.ReactNode; onClick: (e: React.MouseEvent) => void }> = ({ icon, children, onClick }) => (
    <button onClick={onClick} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-accent hover:text-white">
        {icon}
        <span>{children}</span>
    </button>
);

const DropdownMenuSeparator: React.FC = () => <div className="border-t border-primary my-1"></div>;

const ReminderActions: React.FC<{
    reminder: Reminder,
    onEdit: () => void,
    onMove: () => void,
    onRename: () => void,
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({reminder, onEdit, onMove, onRename, setConfirmModal}) => {
    const handleDelete = async () => {
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

    return (
        <DropdownMenu trigger={<button title="More reminder options" className="p-1 rounded-full bg-secondary/80 hover:bg-tertiary"><MoreVertIcon className="text-text-muted text-xl" /></button>}>
            <DropdownMenuItem icon={<PencilIcon className="text-base"/>} onClick={onEdit}>Edit</DropdownMenuItem>
            <DropdownMenuItem icon={<PencilIcon className="text-base"/>} onClick={onRename}>Rename</DropdownMenuItem>
            <DropdownMenuItem icon={<MoveIcon className="text-base"/>} onClick={onMove}>Move to...</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={<TrashIcon className="text-base"/>} onClick={handleDelete}>Delete</DropdownMenuItem>
        </DropdownMenu>
    );
};

const FolderActions: React.FC<{folder: ReminderFolder; onNewReminder: () => void; onNewSubfolder: () => void; onRename: () => void; onDelete: () => void; onCustomize: () => void;}> = (props) => {
    return (
        <DropdownMenu trigger={<button title="More folder options" className="p-1 rounded-full hover:bg-primary"><MoreVertIcon className="text-xl" /></button>}>
            <DropdownMenuItem icon={<BellIcon className="text-base"/>} onClick={props.onNewReminder}>New Reminder</DropdownMenuItem>
            <DropdownMenuItem icon={<FolderIcon className="text-base"/>} onClick={props.onNewSubfolder}>New Subfolder</DropdownMenuItem>
            <DropdownMenuItem icon={<PencilIcon className="text-base"/>} onClick={props.onRename}>Rename</DropdownMenuItem>
            <DropdownMenuItem icon={<PaletteIcon className="text-base"/>} onClick={props.onCustomize}>Customize</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={<TrashIcon className="text-base"/>} onClick={props.onDelete}>Delete Folder</DropdownMenuItem>
        </DropdownMenu>
    );
};

const MoveReminderModal: React.FC<{reminder: Reminder; reminderFolders?: ReminderFolder[]; onClose: () => void;}> = ({ reminder, reminderFolders, onClose }) => {
    const [targetFolderId, setTargetFolderId] = useState<string>(String(reminder.folderId ?? ''));

    const handleMove = async () => {
        const newFolderId = targetFolderId === '' ? undefined : Number(targetFolderId);
        await remindersService.update(reminder.id!, { folderId: newFolderId });
        onClose();
    };

    const renderFolderOptions = (parentId: number | null = null, level = 0) => {
        return reminderFolders?.filter(f => f.parentId === parentId).map(folder => (
            <React.Fragment key={folder.id}>
                <option value={folder.id} style={{ paddingLeft: `${level * 20}px` }}>{folder.name}</option>
                {renderFolderOptions(folder.id, level + 1)}
            </React.Fragment>
        ));
    };

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary">
                <h2 className="text-2xl font-bold mb-4">Move "{reminder.title}"</h2>
                <select value={targetFolderId} onChange={e => setTargetFolderId(e.target.value)} className="w-full bg-primary border border-tertiary rounded-lg py-3 px-3 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary">
                    <option value="">(No folder)</option>
                    {renderFolderOptions()}
                </select>
                <div className="flex justify-end space-x-4 pt-6">
                    <button onClick={onClose} title="Cancel move" className="bg-tertiary hover:bg-opacity-80 text-text-secondary py-2 px-6 rounded-lg">Cancel</button>
                    <button onClick={handleMove} title="Move reminder" className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg">Move</button>
                </div>
            </div>
        </div>
    );
};

const FolderCustomizationModal: React.FC<{ folder: ReminderFolder, onClose: () => void; icons: {[key: string]: React.ComponentType<{className?: string}>}, colors: {[key: string]: string} }> = ({ folder, onClose, icons, colors }) => {

    const handleSetIcon = async (icon: string) => {
        await reminderFoldersService.update(folder.id!, { icon });
    };

    const handleSetColor = async (color: string) => {
        await reminderFoldersService.update(folder.id!, { color });
    };

    const availableIcons = { default: icons.default, book: icons.book, project: icons.project, knowledge: icons.knowledge, personal: icons.personal, work: icons.work, studies: icons.studies, home: icons.home };
    const availableColors = { accent: 'bg-accent', red: 'bg-red-400', orange: 'bg-orange-400', yellow: 'bg-yellow-400', green: 'bg-green-400', teal: 'bg-teal-400', blue: 'bg-blue-400', indigo: 'bg-indigo-400', purple: 'bg-purple-400', pink: 'bg-pink-400', gray: 'bg-gray-400' };

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-tertiary">
                <h2 className="text-2xl font-bold mb-6">Customize "{folder.name}"</h2>
                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-medium text-text-secondary mb-3">Icon</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(availableIcons).map(([key, Icon]) => (
                                <button key={key} title={`Set icon to ${key}`} onClick={() => handleSetIcon(key)} className={`p-3 rounded-lg border-2 ${folder.icon === key || (!folder.icon && key === 'default') ? 'border-accent bg-accent/20' : 'border-tertiary hover:bg-tertiary'}`}>
                                    <Icon className="text-2xl" />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-text-secondary mb-3">Color</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(availableColors).map(([key, className]) => (
                                <button key={key} title={`Set color to ${key}`} onClick={() => handleSetColor(key)} className={`w-9 h-9 rounded-full border-2 ${className} ${folder.color === key ? 'border-white' : 'border-transparent'}`} />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end pt-8">
                    <button onClick={onClose} title="Finish customizing" className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg">Done</button>
                </div>
            </div>
        </div>
    )
};

const ReminderEditModal: React.FC<{
    reminder: Reminder;
    isOpen: boolean;
    onClose: () => void;
    onSave: (reminder: Reminder) => Promise<void>;
    reminderFolders?: ReminderFolder[];
}> = ({ reminder, isOpen, onClose, onSave, reminderFolders }) => {
    const [formData, setFormData] = useState<Reminder>(reminder);
    const [isSaving, setIsSaving] = useState(false);

    React.useEffect(() => {
        setFormData(reminder);
    }, [reminder]);

    const renderFolderOptions = (parentId: number | null = null, level = 0) => {
        return reminderFolders?.filter(f => f.parentId === parentId).map(folder => (
            <React.Fragment key={folder.id}>
                <option value={folder.id} style={{ paddingLeft: `${level * 20}px` }}>{folder.name}</option>
                {renderFolderOptions(folder.id, level + 1)}
            </React.Fragment>
        ));
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Error saving reminder:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-2xl shadow-2xl border border-tertiary max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">{reminder.id ? 'Edit Reminder' : 'Create New Reminder'}</h2>

                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                            placeholder="Reminder title"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-text-secondary">Description</label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, description: (formData.description || '') + '\n• ' })}
                                    title="Add list item"
                                    className="p-1.5 rounded hover:bg-tertiary text-text-secondary hover:text-accent transition-colors"
                                >
                                    <FormatListIcon className="text-lg" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, description: (formData.description || '') + '\n[Photo]' })}
                                    title="Add photo placeholder"
                                    className="p-1.5 rounded hover:bg-tertiary text-text-secondary hover:text-accent transition-colors"
                                >
                                    <ImageIcon className="text-lg" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, description: (formData.description || '') + '\n📍 Location: ' })}
                                    title="Add location"
                                    className="p-1.5 rounded hover:bg-tertiary text-text-secondary hover:text-accent transition-colors"
                                >
                                    <LocationIcon className="text-lg" />
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary resize-none"
                            placeholder="Add details..."
                            rows={4}
                        />
                    </div>

                    {/* Due Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Due Date</label>
                            <input
                                type="date"
                                value={new Date(formData.dueDate).toISOString().split('T')[0]}
                                onChange={(e) => {
                                    const date = new Date(e.target.value);
                                    setFormData({ ...formData, dueDate: date.toISOString() });
                                }}
                                className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Due Time</label>
                            <input
                                type="time"
                                value={formData.dueTime || ''}
                                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                                className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                            />
                        </div>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Priority</label>
                        <select
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                            className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Category</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                        >
                            <option value="personal">Personal</option>
                            <option value="work">Work</option>
                            <option value="health">Health</option>
                            <option value="finance">Finance</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'completed' | 'overdue' })}
                            className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                        >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>

                    {/* Folder */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Folder</label>
                        <select
                            value={formData.folderId || ''}
                            onChange={(e) => setFormData({ ...formData, folderId: e.target.value === '' ? null : Number(e.target.value) })}
                            className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                        >
                            <option value="">(No folder)</option>
                            {renderFolderOptions()}
                        </select>
                    </div>

                    {/* Notification */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={formData.notificationEnabled || false}
                            onChange={(e) => setFormData({ ...formData, notificationEnabled: e.target.checked })}
                            className="w-4 h-4 rounded"
                        />
                        <label className="text-sm font-medium text-text-secondary">Enable notification</label>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-4 pt-6 border-t border-tertiary mt-6">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="bg-tertiary hover:bg-opacity-80 text-text-secondary py-2 px-6 rounded-lg disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save Reminder'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Reminders;

