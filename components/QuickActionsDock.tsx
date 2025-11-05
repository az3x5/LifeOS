import React, { useState } from 'react';

interface QuickActionsDockProps {
    openAddTransaction: () => void;
    openMarkHabit: () => void;
    openAddHealthLog: () => void;
    openAddNote: () => void;
    openLogPrayer: () => void;
}

const ActionButton: React.FC<{
    icon: string;
    label: string;
    onClick: () => void;
    style?: React.CSSProperties;
}> = ({ icon, label, onClick, style }) => (
    <div
        className="flex items-center justify-end gap-3 animate-fab-scale-in"
        style={style}
    >
        <div className="bg-secondary text-text-primary text-sm font-semibold py-1 px-3 rounded-md shadow-md">
            {label}
        </div>
        <button
            onClick={onClick}
            className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center shadow-lg transform transition-transform hover:scale-110"
        >
            <span className="material-symbols-outlined text-accent text-2xl">{icon}</span>
        </button>
    </div>
);

const QuickActionsDock: React.FC<QuickActionsDockProps> = (props) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleActionClick = (action: () => void) => {
        action();
        setIsOpen(false);
    };

    const actions = [
        { icon: 'note_add', label: 'Add Note', action: () => handleActionClick(props.openAddNote) },
        { icon: 'monitor_heart', label: 'Add Health Log', action: () => handleActionClick(props.openAddHealthLog) },
        { icon: 'mosque', label: 'Log Prayer', action: () => handleActionClick(props.openLogPrayer) },
        { icon: 'task_alt', label: 'Mark Habit', action: () => handleActionClick(props.openMarkHabit) },
        { icon: 'payments', label: 'Add Expense', action: () => handleActionClick(props.openAddTransaction) },
    ];

    return (
        <div className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-40 flex flex-col items-end gap-4">
            {isOpen && (
                <>
                    {actions.map((item, index) => (
                        <ActionButton
                            key={item.label}
                            icon={item.icon}
                            label={item.label}
                            onClick={item.action}
                            style={{ animationDelay: `${(actions.length - index) * 50}ms` }}
                        />
                    ))}
                </>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-16 h-16 bg-accent hover:bg-accent-hover text-white rounded-full flex items-center justify-center shadow-xl transform transition-transform duration-300 hover:scale-110"
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
            >
                <span className={`material-symbols-outlined text-3xl transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
                    add
                </span>
            </button>
        </div>
    );
};

export default QuickActionsDock;