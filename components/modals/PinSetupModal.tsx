import React, { useState, useEffect } from 'react';

interface PinSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSetup: (pin: string) => Promise<boolean>;
    mode: 'setup' | 'change';
    currentPin?: string;
}

const PinSetupModal: React.FC<PinSetupModalProps> = ({ isOpen, onClose, onSetup, mode, currentPin }) => {
    const [step, setStep] = useState<'current' | 'new' | 'confirm'>(mode === 'change' ? 'current' : 'new');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [oldPin, setOldPin] = useState('');
    const [error, setError] = useState('');

    // Add keyboard support for desktop
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyPress = (e: KeyboardEvent) => {
            // Handle number keys (0-9)
            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handlePinInput(e.key);
            }
            // Handle backspace
            else if (e.key === 'Backspace') {
                e.preventDefault();
                handleBackspace();
            }
            // Handle enter to submit
            else if (e.key === 'Enter') {
                e.preventDefault();
                const currentPinLength = step === 'current' ? oldPin.length :
                                       step === 'new' ? pin.length : confirmPin.length;
                if (currentPinLength >= 4) {
                    handleNext();
                }
            }
            // Handle escape to close
            else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isOpen, step, pin, confirmPin, oldPin]); // Re-attach when dependencies change

    if (!isOpen) return null;

    const handlePinInput = (digit: string) => {
        if (step === 'current') {
            if (oldPin.length < 6) {
                setOldPin(oldPin + digit);
            }
        } else if (step === 'new') {
            if (pin.length < 6) {
                setPin(pin + digit);
            }
        } else if (step === 'confirm') {
            if (confirmPin.length < 6) {
                setConfirmPin(confirmPin + digit);
            }
        }
    };

    const handleBackspace = () => {
        if (step === 'current') {
            setOldPin(oldPin.slice(0, -1));
        } else if (step === 'new') {
            setPin(pin.slice(0, -1));
        } else if (step === 'confirm') {
            setConfirmPin(confirmPin.slice(0, -1));
        }
    };

    const handleNext = async () => {
        setError('');

        if (step === 'current') {
            if (oldPin.length < 4) {
                setError('PIN must be at least 4 digits');
                return;
            }
            // Verify current PIN would be done in parent component
            setStep('new');
        } else if (step === 'new') {
            if (pin.length < 4) {
                setError('PIN must be at least 4 digits');
                return;
            }
            setStep('confirm');
        } else if (step === 'confirm') {
            if (confirmPin !== pin) {
                setError('PINs do not match');
                setConfirmPin('');
                return;
            }

            const success = await onSetup(pin);
            if (success) {
                handleClose();
            } else {
                setError('Failed to set up PIN');
            }
        }
    };

    const handleClose = () => {
        setStep(mode === 'change' ? 'current' : 'new');
        setPin('');
        setConfirmPin('');
        setOldPin('');
        setError('');
        onClose();
    };

    const getCurrentPin = () => {
        if (step === 'current') return oldPin;
        if (step === 'new') return pin;
        return confirmPin;
    };

    const getTitle = () => {
        if (step === 'current') return 'Enter Current PIN';
        if (step === 'new') return mode === 'change' ? 'Enter New PIN' : 'Create PIN';
        return 'Confirm PIN';
    };

    const getDescription = () => {
        if (step === 'current') return 'Enter your current PIN to continue';
        if (step === 'new') return 'Enter a PIN with at least 4 digits';
        return 'Re-enter your PIN to confirm';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-lg max-w-md w-full p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-text-primary">{getTitle()}</h2>
                    <button
                        onClick={handleClose}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Description */}
                <p className="text-text-secondary text-sm mb-6">{getDescription()}</p>

                {/* PIN Display */}
                <div className="flex justify-center gap-3 mb-6">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                        <div
                            key={index}
                            className={`w-4 h-4 rounded-full border-2 transition-all ${
                                index < getCurrentPin().length
                                    ? 'bg-accent border-accent'
                                    : 'border-tertiary'
                            }`}
                        />
                    ))}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 mb-4">
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                )}

                {/* PIN Keypad */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                        <button
                            key={digit}
                            onClick={() => handlePinInput(digit.toString())}
                            className="bg-tertiary hover:bg-accent text-text-primary font-bold text-2xl py-4 rounded-lg transition-colors"
                        >
                            {digit}
                        </button>
                    ))}
                    <button
                        onClick={handleBackspace}
                        className="bg-tertiary hover:bg-red-600 text-text-primary font-bold py-4 rounded-lg transition-colors"
                    >
                        ⌫
                    </button>
                    <button
                        onClick={() => handlePinInput('0')}
                        className="bg-tertiary hover:bg-accent text-text-primary font-bold text-2xl py-4 rounded-lg transition-colors"
                    >
                        0
                    </button>
                    <button
                        onClick={handleNext}
                        className="bg-accent hover:bg-accent-hover text-white font-bold py-4 rounded-lg transition-colors"
                    >
                        ✓
                    </button>
                </div>

                {/* Cancel Button */}
                <button
                    onClick={handleClose}
                    className="w-full bg-tertiary hover:bg-red-600 text-text-primary font-bold py-3 rounded-lg transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default PinSetupModal;

