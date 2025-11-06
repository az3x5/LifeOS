import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { Note, Folder } from '../types';
import { notesService, foldersService } from '../services/dataService';
import ConfirmModal from '../components/modals/ConfirmModal';
import AlertModal from '../components/modals/AlertModal';

type NoteFilter = 'all' | 'pinned' | 'trash';

const slugify = (text: string) =>
    text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

const parseMarkdown = (text: string): string => {
    if (!text) return '';
    const inlineParse = (text: string) => text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[\[(.*?)\]\]/g, `<a data-note-title="$1" class="text-accent hover:underline bg-accent/20 px-1 rounded-sm cursor-pointer">$1</a>`);

    return text
        .split('\n')
        .map(block => {
            if (block.startsWith('# ')) return `<h1 id="${slugify(block.substring(2))}" class="text-3xl font-bold my-4">${inlineParse(block.substring(2))}</h1>`;
            if (block.startsWith('## ')) return `<h2 id="${slugify(block.substring(3))}" class="text-2xl font-bold my-3">${inlineParse(block.substring(3))}</h2>`;
            if (block.startsWith('### ')) return `<h3 id="${slugify(block.substring(4))}" class="text-xl font-bold my-2">${inlineParse(block.substring(4))}</h3>`;
            if (block.match(/^\s*-\s/)) return `<li class="ml-6 list-disc">${inlineParse(block.replace(/^\s*-\s/, ''))}</li>`;
             if (block.trim() === '') return '<br />';
            return `<p class="my-2">${inlineParse(block)}</p>`;
        })
        .join('');
};

// --- ICONS ---
const MenuIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>menu</span>;
const FolderIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>folder</span>;
const FolderPlusIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>create_new_folder</span>;
const ChevronRightIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>chevron_right</span>;
const PinIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>push_pin</span>;
const NotesIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>article</span>;
const TrashIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>delete</span>;
const MoreVertIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>more_vert</span>;
const PencilIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>note_add</span>;
const MoveIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>drive_file_move</span>;
const PaletteIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>palette</span>;
const BookIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>menu_book</span>;
const ProjectIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>view_kanban</span>;
const BrainIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>psychology</span>;
const HeartIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>favorite</span>;
const BriefcaseIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>work</span>;
const SchoolIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>school</span>;
const HomeIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>home</span>;

// --- Formatting Bar Icons ---
const BoldIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>format_bold</span>;
const ItalicIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>format_italic</span>;
const ListIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>format_list_bulleted</span>;
const LinkIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>link</span>;

const Notes: React.FC = () => {
    const allNotes = useSupabaseQuery<Note>('notes');
    const folders = useSupabaseQuery<Folder>('folders');

    const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
    const [noteFilter, setNoteFilter] = useState<NoteFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isNotesSidebarOpen, setIsNotesSidebarOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null>(null);
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; icon?: string } | null>(null);
    
    const selectedNote = useMemo(() => {
        const note = allNotes?.find(n => n.id === selectedNoteId);
        if (note) return note;
        if (selectedNoteId) setSelectedNoteId(null);
        return null;
    }, [allNotes, selectedNoteId]);

    const handleNewNote = async (folderId?: number) => {
        const newNote = await notesService.create({
            title: 'Untitled Note',
            content: '',
            createdAt: new Date(),
            updatedAt: new Date(),
            folderId: folderId,
            status: 'active',
            pinned: noteFilter === 'pinned',
        });
        setNoteFilter('all');
        if (newNote && newNote.id) {
            handleSelectNote(newNote.id);
        }
    };

    const handleSelectNote = (id: number | null) => {
        setSelectedNoteId(id);
        setIsNotesSidebarOpen(false);
    };
    
    return (
        <div className="flex h-full bg-primary font-sans relative overflow-hidden">
            {isNotesSidebarOpen && (
                <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setIsNotesSidebarOpen(false)} />
            )}
            <Sidebar
                folders={folders}
                notes={allNotes}
                noteFilter={noteFilter}
                setNoteFilter={setNoteFilter}
                selectedNoteId={selectedNoteId}
                setSelectedNoteId={handleSelectNote}
                onNewNote={handleNewNote}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isNotesSidebarOpen={isNotesSidebarOpen}
                setConfirmModal={setConfirmModal}
                setAlertModal={setAlertModal}
            />
            <main className="flex-1 flex flex-col min-w-0">
                {selectedNote ? (
                    <EditorPanel key={selectedNote.id} note={selectedNote} toggleSidebar={() => setIsNotesSidebarOpen(p => !p)} setConfirmModal={setConfirmModal} />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-text-muted bg-primary relative">
                         <button onClick={() => setIsNotesSidebarOpen(true)} title="Open notes list" className="md:hidden absolute top-4 left-4 p-2 rounded-md text-text-primary bg-secondary border border-tertiary">
                            <MenuIcon className="text-2xl" />
                        </button>
                        <div className="text-center">
                            <NotesIcon className="text-6xl mx-auto text-tertiary" />
                            <h2 className="mt-4 text-xl font-semibold">Select a note</h2>
                            <p>Choose a note from the list to view or edit it.</p>
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
            {alertModal && (
                <AlertModal
                    isOpen={alertModal.isOpen}
                    title={alertModal.title}
                    message={alertModal.message}
                    icon={alertModal.icon || "⚠️"}
                    onClose={() => setAlertModal(null)}
                />
            )}
        </div>
    );
};

const Sidebar: React.FC<{
    folders?: Folder[]; notes?: Note[]; noteFilter: NoteFilter; setNoteFilter: (f: NoteFilter) => void;
    selectedNoteId: number | null; setSelectedNoteId: (id: number | null) => void;
    onNewNote: (folderId?: number) => void;
    searchQuery: string; setSearchQuery: (q: string) => void;
    isNotesSidebarOpen: boolean;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
    setAlertModal: (modal: { isOpen: boolean; title: string; message: string; icon?: string } | null) => void;
}> = (props) => {
    const [renamingNoteId, setRenamingNoteId] = useState<number|null>(null);
    const [movingNote, setMovingNote] = useState<Note|null>(null);
    const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

    const filteredNotes = useMemo(() => {
        let tempNotes = props.notes ?? [];
        switch(props.noteFilter) {
            case 'pinned': tempNotes = tempNotes.filter(n => n.pinned && n.status === 'active'); break;
            case 'trash': tempNotes = tempNotes.filter(n => n.status === 'trash'); break;
            default: tempNotes = tempNotes.filter(n => n.status === 'active');
        }
        if (props.searchQuery) {
            const q = props.searchQuery.toLowerCase();
            tempNotes = tempNotes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
        }
        return tempNotes;
    }, [props.notes, props.noteFilter, props.searchQuery]);

    const handleRenameNote = async (note: Note, newName: string) => {
        if (renamingNoteId !== note.id) return;
        setRenamingNoteId(null);
        if (newName.trim() && newName.trim() !== note.title) {
            await notesService.update(note.id!, { title: newName.trim(), updatedAt: new Date() });
        }
    };
    
    const handleNewFolder = async (parentId: number | null = null) => {
        const newFolder = await foldersService.create({
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

    const isFilterActive = props.searchQuery.length > 0 || props.noteFilter !== 'all';
    
    return (
        <div className={`w-72 md:w-80 bg-secondary border-r border-tertiary flex flex-col transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 fixed inset-y-0 left-0 z-30 ${props.isNotesSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
             <div className="p-3 flex-shrink-0 space-y-3">
                 <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Notes</h1>
                    <div className="flex items-center">
                        <button onClick={() => handleNewFolder(null)} title="New Folder" className="p-2 rounded-md hover:bg-tertiary">
                            <FolderPlusIcon className="text-xl" />
                        </button>
                        <button onClick={() => props.onNewNote()} title="New Note" className="p-2 rounded-md hover:bg-tertiary">
                            <PencilIcon className="text-xl" />
                        </button>
                    </div>
                 </div>
                 <input type="text" placeholder="Search notes..." value={props.searchQuery} onChange={e => props.setSearchQuery(e.target.value)}
                    className="w-full bg-primary border border-tertiary rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
            <div className="px-3 pb-2 space-y-1 border-b border-tertiary">
                <NavItem icon={<NotesIcon className="text-xl"/>} label="All Notes" isActive={props.noteFilter === 'all'} onClick={() => props.setNoteFilter('all')} />
                <NavItem icon={<PinIcon className="text-xl"/>} label="Pinned" isActive={props.noteFilter === 'pinned'} onClick={() => props.setNoteFilter('pinned')} />
                <NavItem icon={<TrashIcon className="text-xl"/>} label="Trash" isActive={props.noteFilter === 'trash'} onClick={() => props.setNoteFilter('trash')} />
            </div>
            <div className="flex-1 overflow-y-auto p-3">
                {isFilterActive ? (
                     <div className="space-y-1">
                        <h2 className="px-2 text-sm font-semibold text-text-secondary mb-2">{filteredNotes.length} Result(s)</h2>
                        {filteredNotes.map(note => (
                            <NoteItem
                                key={note.id}
                                note={note}
                                isSelected={props.selectedNoteId === note.id}
                                isRenaming={renamingNoteId === note.id}
                                onSelect={() => props.setSelectedNoteId(note.id!)}
                                onRename={handleRenameNote}
                                onStartRename={() => setRenamingNoteId(note.id!)}
                                onCancelRename={() => setRenamingNoteId(null)}
                                onMove={() => setMovingNote(note)}
                                setConfirmModal={props.setConfirmModal}
                            />
                        ))}
                    </div>
                ) : (
                    <FolderTree
                        folders={props.folders}
                        notes={props.notes}
                        selectedNoteId={props.selectedNoteId}
                        setSelectedNoteId={props.setSelectedNoteId}
                        onNewNote={props.onNewNote}
                        renamingNoteId={renamingNoteId}
                        setRenamingNoteId={setRenamingNoteId}
                        onRenameNote={handleRenameNote}
                        onMoveNote={(note) => setMovingNote(note)}
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
             {movingNote && <MoveNoteModal note={movingNote} folders={props.folders} onClose={() => setMovingNote(null)} />}
        </div>
    );
};

const NavItem: React.FC<{ icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }> = ({ icon, label, isActive, onClick }) => (
    <button onClick={onClick} title={`Show ${label}`} className={`w-full flex items-center space-x-3 px-2 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-accent/30 text-accent' : 'text-text-primary hover:bg-tertiary'}`}>
        {icon}
        <span>{label}</span>
    </button>
);

const FolderTree: React.FC<{
    folders?: Folder[]; notes?: Note[]; parentId?: number | null; level?: number;
    selectedNoteId: number | null; setSelectedNoteId: (id: number | null) => void;
    onNewNote: (folderId?: number) => void; renamingNoteId: number | null; setRenamingNoteId: (id: number | null) => void;
    onRenameNote: (note: Note, newName: string) => void; onMoveNote: (note: Note) => void;
    expandedFolders: Set<number>; toggleFolder: (folderId: number) => void;
    renamingFolderId: number | null; setRenamingFolderId: (id: number | null) => void;
    onNewFolder: (parentId: number | null) => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
    setAlertModal: (modal: { isOpen: boolean; title: string; message: string; icon?: string } | null) => void;
}> = (props) => {
    const { folders, notes, parentId = null, level = 0, selectedNoteId, setSelectedNoteId, onNewNote, renamingNoteId, setRenamingNoteId, onRenameNote, onMoveNote, expandedFolders, toggleFolder, renamingFolderId, setRenamingFolderId, onNewFolder } = props;
    
    const [customizingFolder, setCustomizingFolder] = useState<Folder|null>(null);

    const childFolders = useMemo(() => folders?.filter(f => f.parentId === parentId) ?? [], [folders, parentId]);
    const childNotes = useMemo(() => notes?.filter(n => n.folderId === (parentId || undefined) && n.status === 'active').sort((a,b) => a.title.localeCompare(b.title)) ?? [], [notes, parentId]);

    const handleRenameFolder = async (folder: Folder, newName: string) => {
        if (renamingFolderId !== folder.id) return;
        setRenamingFolderId(null);
        if(newName.trim() && newName.trim() !== folder.name) {
            await foldersService.update(folder.id!, { name: newName.trim() });
        }
    }
    
    const handleDeleteFolder = async (folder: Folder) => {
        const childNotesCount = (props.notes?.filter(n => n.folderId === folder.id) || []).length;
        const childFoldersCount = (props.folders?.filter(f => f.parentId === folder.id) || []).length;
        if (childNotesCount > 0 || childFoldersCount > 0) {
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
                await foldersService.delete(folder.id!);
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

    const FolderDisplayIcon = ({ folder }: { folder: Folder }) => {
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
                                <FolderActions folder={folder} onNewNote={() => onNewNote(folder.id)} onNewSubfolder={() => onNewFolder(folder.id!)} onRename={() => setRenamingFolderId(folder.id!)} onDelete={() => handleDeleteFolder(folder)} onCustomize={() => setCustomizingFolder(folder)} />
                            </div>
                        </div>
                    )}
                    {expandedFolders.has(folder.id!) && (
                        <FolderTree {...props} parentId={folder.id} level={level + 1} />
                    )}
                </div>
            ))}

            <div className="border-l border-tertiary/50" style={{ marginLeft: '7px' }}>
                {childNotes.map(note => (
                    <NoteItem key={note.id} note={note} level={level} isSelected={selectedNoteId === note.id} isRenaming={renamingNoteId === note.id} onSelect={() => setSelectedNoteId(note.id!)} onRename={onRenameNote} onStartRename={() => setRenamingNoteId(note.id!)} onCancelRename={()=> setRenamingNoteId(null)} onMove={() => onMoveNote(note)} setConfirmModal={props.setConfirmModal} />
                ))}
            </div>
             {customizingFolder && <FolderCustomizationModal folder={customizingFolder} onClose={() => setCustomizingFolder(null)} icons={FOLDER_ICONS} colors={COLOR_CLASSES} />}
        </div>
    );
};

const NoteItem: React.FC<{
    note: Note; level?: number; isSelected: boolean; isRenaming: boolean;
    onSelect: () => void; onRename: (note: Note, newName: string) => void;
    onStartRename: () => void; onCancelRename: () => void; onMove: () => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({ note, level=0, isSelected, isRenaming, onSelect, onRename, onStartRename, onCancelRename, onMove, setConfirmModal }) => {
    if (isRenaming) {
        return (
             <div style={{ paddingLeft: `${(level * 16) + 16}px`}} className="py-1">
                 <input type="text" defaultValue={note.title} autoFocus
                    onBlur={(e) => onRename(note, e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onRename(note, e.currentTarget.value);
                        if (e.key === 'Escape') onCancelRename();
                    }}
                    className="w-full bg-primary border border-accent rounded-md py-1 px-2 text-sm"
                 />
             </div>
        )
    }
    return (
        <div className="w-full text-left flex items-center pr-1 rounded-md text-sm group" style={{ paddingLeft: `${level * 16}px`}}>
            <button onClick={onSelect} title={note.title} className={`flex-1 flex items-center p-1 rounded-md truncate ${isSelected ? 'bg-accent/30' : 'hover:bg-tertiary'}`}>
                <NotesIcon className={`text-lg mr-2 flex-shrink-0 ${isSelected ? 'text-accent' : 'text-text-secondary'}`} />
                <span className={`truncate ${isSelected ? 'text-accent' : 'text-text-primary'}`}>{note.title}</span>
            </button>
             <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <NoteActions note={note} onMove={onMove} onRename={onStartRename} setConfirmModal={setConfirmModal} />
            </div>
        </div>
    )
}

const FormattingToolbar: React.FC<{
    onApply: (prefix: string, suffix?: string, placeholder?: string) => void;
}> = ({ onApply }) => {
    return (
        <div className="p-2 bg-secondary border-b border-tertiary flex items-center space-x-1">
            <button title="Bold" onClick={() => onApply('**', '**', 'bold text')} className="p-2 rounded-md hover:bg-tertiary"><BoldIcon className="text-xl" /></button>
            <button title="Italic" onClick={() => onApply('*', '*', 'italic text')} className="p-2 rounded-md hover:bg-tertiary"><ItalicIcon className="text-xl" /></button>
            <div className="w-px h-6 bg-tertiary mx-1"></div>
            <button title="Heading 1" onClick={() => onApply('# ', '', 'Heading 1')} className="p-2 rounded-md hover:bg-tertiary font-bold text-lg">H1</button>
            <button title="Heading 2" onClick={() => onApply('## ', '', 'Heading 2')} className="p-2 rounded-md hover:bg-tertiary font-bold text-base">H2</button>
            <button title="Heading 3" onClick={() => onApply('### ', '', 'Heading 3')} className="p-2 rounded-md hover:bg-tertiary font-bold text-sm">H3</button>
            <div className="w-px h-6 bg-tertiary mx-1"></div>
            <button title="Unordered List" onClick={() => onApply('- ', '', 'List item')} className="p-2 rounded-md hover:bg-tertiary"><ListIcon className="text-xl" /></button>
            <button title="Link" onClick={() => onApply('[', '](url)', 'link text')} className="p-2 rounded-md hover:bg-tertiary"><LinkIcon className="text-xl" /></button>
            <button title="Note Link" onClick={() => onApply('[[', ']]', 'Note Title')} className="p-2 rounded-md hover:bg-tertiary font-mono text-lg">[[]]</button>
        </div>
    );
};

const EditorPanel: React.FC<{
    note: Note;
    toggleSidebar: () => void;
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({ note: initialNote, toggleSidebar, setConfirmModal }) => {
    const [title, setTitle] = useState(initialNote.title);
    const [content, setContent] = useState(initialNote.content);
    const [isEditing, setIsEditing] = useState(true);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSave = useCallback(async (newTitle: string, newContent: string) => {
        if (newTitle.trim() === initialNote.title && newContent === initialNote.content) return;
        const updatedNote = { ...initialNote, title: newTitle.trim() || 'Untitled Note', content: newContent, updatedAt: new Date() };
        await notesService.update(initialNote.id!, updatedNote);
    }, [initialNote]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (isEditing) handleSave(title, content);
        }, 1000);
        return () => clearTimeout(handler);
    }, [title, content, isEditing, handleSave]);
    
    const handleToggleEdit = () => {
        if (isEditing) {
            handleSave(title, content);
        }
        setIsEditing(prev => !prev);
    };
    
    const applyMarkdown = (prefix: string, suffix: string = '', placeholder: string = '') => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);

        let newContent: string;
        let selectionStart: number;
        let selectionEnd: number;

        if (selectedText) {
            newContent = `${content.substring(0, start)}${prefix}${selectedText}${suffix}${content.substring(end)}`;
            selectionStart = start + prefix.length;
            selectionEnd = selectionStart + selectedText.length;
        } else {
            newContent = `${content.substring(0, start)}${prefix}${placeholder}${suffix}${content.substring(end)}`;
            selectionStart = start + prefix.length;
            selectionEnd = selectionStart + placeholder.length;
        }

        setContent(newContent);
        
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(selectionStart, selectionEnd);
        }, 0);
    };

    const handleTogglePin = async () => {
        await notesService.update(initialNote.id!, { pinned: !initialNote.pinned });
    };
    const handleTrash = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Move to Trash',
            message: `Move "${initialNote.title}" to trash?`,
            icon: '🗑️',
            onConfirm: async () => {
                await notesService.update(initialNote.id!, { status: 'trash' as const });
                setConfirmModal(null);
            }
        });
    };
    const handleRestore = async () => {
        await notesService.update(initialNote.id!, { status: 'active' as const });
    };
    const handleDeleteForever = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Forever',
            message: `Permanently delete "${initialNote.title}"? This cannot be undone.`,
            icon: '⚠️',
            onConfirm: async () => {
                await notesService.delete(initialNote.id!);
                setConfirmModal(null);
            }
        });
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-primary">
            {initialNote.status === 'trash' && (
                <div className="p-3 bg-yellow-900/50 text-yellow-300 text-center text-sm flex items-center justify-center space-x-4">
                    <span>This note is in the trash.</span>
                    <button onClick={handleRestore} title="Restore note" className="font-semibold hover:underline">Restore</button>
                    <button onClick={handleDeleteForever} title="Delete note forever" className="font-semibold text-red-400 hover:underline">Delete Forever</button>
                </div>
            )}
            <div className="p-3 border-b border-tertiary flex-shrink-0 flex items-center justify-between gap-2">
                 <button onClick={toggleSidebar} title="Toggle notes list" className="p-2 -ml-2 rounded-lg text-text-muted hover:bg-tertiary md:hidden">
                    <MenuIcon className="text-2xl" />
                </button>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} disabled={initialNote.status==='trash' || !isEditing}
                    className={`w-full bg-transparent text-2xl font-bold focus:outline-none text-text-primary ${isEditing ? '' : 'pointer-events-none'}`} />
                <div className="flex items-center space-x-2">
                    <button onClick={handleToggleEdit} title={isEditing ? 'View Mode' : 'Edit Mode'} className="p-2 rounded-lg text-text-muted hover:bg-tertiary">
                         {isEditing ? <BookIcon className="text-xl"/> : <PencilIcon className="text-xl"/>}
                    </button>
                    <button onClick={handleTogglePin} title={initialNote.pinned ? "Unpin Note" : "Pin Note"} className={`p-2 rounded-lg text-text-muted hover:bg-tertiary ${initialNote.pinned ? 'text-yellow-400' : ''}`}>
                        <PinIcon className="text-xl"/>
                    </button>
                    {initialNote.status === 'active' && 
                        <button onClick={handleTrash} title="Move to Trash" className="p-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-tertiary">
                            <TrashIcon className="text-xl"/>
                        </button>
                    }
                </div>
            </div>
            
            {isEditing && <FormattingToolbar onApply={applyMarkdown} />}

            <div className="flex-1 overflow-y-auto">
                {isEditing ? (
                    <textarea ref={textareaRef} value={content} onChange={e => setContent(e.target.value)} readOnly={initialNote.status==='trash'}
                        className="h-full w-full p-4 bg-primary text-text-primary resize-none focus:outline-none font-mono leading-relaxed" />
                ) : (
                    <div className="h-full w-full p-4 prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }} />
                )}
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

const NoteActions: React.FC<{
    note: Note,
    onMove: () => void,
    onRename: () => void,
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void;
}> = ({note, onMove, onRename, setConfirmModal}) => {
     const handleTogglePin = async () => await notesService.update(note.id!, { pinned: !note.pinned });
     const handleTrash = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Move to Trash',
            message: `Move "${note.title}" to trash?`,
            icon: '🗑️',
            onConfirm: async () => {
                await notesService.update(note.id!, { status: 'trash' });
                setConfirmModal(null);
            }
        });
     };
    
    return (
        <DropdownMenu trigger={<button title="More note options" className="p-1 rounded-full bg-secondary/80 hover:bg-tertiary"><MoreVertIcon className="text-text-muted text-xl" /></button>}>
            <DropdownMenuItem icon={<PencilIcon className="text-base"/>} onClick={onRename}>Rename</DropdownMenuItem>
            <DropdownMenuItem icon={<PinIcon className="text-base"/>} onClick={handleTogglePin}>{note.pinned ? 'Unpin' : 'Pin'}</DropdownMenuItem>
            <DropdownMenuItem icon={<MoveIcon className="text-base"/>} onClick={onMove}>Move to...</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={<TrashIcon className="text-base"/>} onClick={handleTrash}>Move to Trash</DropdownMenuItem>
        </DropdownMenu>
    );
};

const FolderActions: React.FC<{folder: Folder; onNewNote: () => void; onNewSubfolder: () => void; onRename: () => void; onDelete: () => void; onCustomize: () => void;}> = (props) => {
    return (
        <DropdownMenu trigger={<button title="More folder options" className="p-1 rounded-full hover:bg-primary"><MoreVertIcon className="text-xl" /></button>}>
            <DropdownMenuItem icon={<NotesIcon className="text-base"/>} onClick={props.onNewNote}>New Note</DropdownMenuItem>
            <DropdownMenuItem icon={<FolderIcon className="text-base"/>} onClick={props.onNewSubfolder}>New Subfolder</DropdownMenuItem>
            <DropdownMenuItem icon={<PencilIcon className="text-base"/>} onClick={props.onRename}>Rename</DropdownMenuItem>
            <DropdownMenuItem icon={<PaletteIcon className="text-base"/>} onClick={props.onCustomize}>Customize</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={<TrashIcon className="text-base"/>} onClick={props.onDelete}>Delete Folder</DropdownMenuItem>
        </DropdownMenu>
    );
};

const MoveNoteModal: React.FC<{note: Note; folders?: Folder[]; onClose: () => void;}> = ({ note, folders, onClose }) => {
    const [targetFolderId, setTargetFolderId] = useState<string>(String(note.folderId ?? ''));

    const handleMove = async () => {
        const newFolderId = targetFolderId === '' ? undefined : Number(targetFolderId);
        await notesService.update(note.id!, { folderId: newFolderId });
        onClose();
    };
    
    const renderFolderOptions = (parentId: number | null = null, level = 0) => {
        return folders?.filter(f => f.parentId === parentId).map(folder => (
            <React.Fragment key={folder.id}>
                <option value={folder.id} style={{ paddingLeft: `${level * 20}px` }}>{folder.name}</option>
                {renderFolderOptions(folder.id, level + 1)}
            </React.Fragment>
        ));
    };

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary">
                <h2 className="text-2xl font-bold mb-4">Move "{note.title}"</h2>
                 <select value={targetFolderId} onChange={e => setTargetFolderId(e.target.value)} className="w-full bg-primary border border-tertiary rounded-lg py-3 px-3 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary">
                    <option value="">(No folder)</option>
                    {renderFolderOptions()}
                </select>
                <div className="flex justify-end space-x-4 pt-6">
                    <button onClick={onClose} title="Cancel move" className="bg-tertiary hover:bg-opacity-80 text-text-secondary py-2 px-6 rounded-lg">Cancel</button>
                    <button onClick={handleMove} title="Move note" className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg">Move</button>
                </div>
            </div>
        </div>
    );
};

const FolderCustomizationModal: React.FC<{ folder: Folder, onClose: () => void; icons: {[key: string]: React.ComponentType<{className?: string}>}, colors: {[key: string]: string} }> = ({ folder, onClose, icons, colors }) => {
    
    const handleSetIcon = async (icon: string) => {
        await foldersService.update(folder.id!, { icon });
    };

    const handleSetColor = async (color: string) => {
        await foldersService.update(folder.id!, { color });
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


export default Notes;