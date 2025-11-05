import React from 'react';

interface AlertModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    buttonText?: string;
    buttonClass?: string;
    icon?: string;
    onClose: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({
    isOpen,
    title,
    message,
    buttonText = 'OK',
    buttonClass = 'bg-accent hover:bg-accent/80',
    icon = 'ℹ️',
    onClose,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-6 w-full max-w-md shadow-2xl border border-tertiary animate-scale-in">
                <div className="flex items-start space-x-4 mb-6">
                    <div className="text-4xl">{icon}</div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-text-primary mb-2">{title}</h2>
                        <p className="text-text-secondary">{message}</p>
                    </div>
                </div>
                
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className={`px-6 py-2.5 rounded-lg text-white font-medium transition-colors ${buttonClass}`}
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertModal;

