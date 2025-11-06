import React, { useState } from 'react';
import { Module, Note } from '../../types';
import { notesService } from '../../services/dataService';

interface QuickAddNoteModalProps {
    closeModal: () => void;
    setActiveModule: (module: Module) => void;
}

const QuickAddNoteModal: React.FC<QuickAddNoteModalProps> = ({ closeModal, setActiveModule }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            alert('Please enter a title for the note.');
            return;
        }
        await notesService.create({
            title: title.trim(),
            content: content.trim(),
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'active',
            pinned: false,
        } as Note);
        closeModal();
        setActiveModule(Module.NOTES);
    };

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-tertiary animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6">Add New Note</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                            className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent" required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Content (Optional)</label>
                        <textarea value={content} onChange={e => setContent(e.target.value)}
                            className="w-full h-40 bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent" />
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={closeModal} className="bg-tertiary hover:bg-opacity-80 text-text-secondary py-2 px-6 rounded-lg">Cancel</button>
                        <button type="submit" className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg">Save Note</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuickAddNoteModal;