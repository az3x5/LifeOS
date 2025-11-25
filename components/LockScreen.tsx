import React, { useState, useEffect } from 'react';
import { verifyPin, authenticateWithBiometric, isBiometricEnabled, isBiometricAvailable } from '../services/securityService';

interface LockScreenProps {
    onUnlock: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [showBiometric, setShowBiometric] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);

    useEffect(() => {
        // Check if biometric is available and enabled
        const checkBiometric = async () => {
            const available = await isBiometricAvailable();
            const enabled = isBiometricEnabled();
            setBiometricAvailable(available && enabled);
            setShowBiometric(available && enabled);
        };
        checkBiometric();
    }, []);

    // Add keyboard support for desktop
    useEffect(() => {
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
            else if (e.key === 'Enter' && pin.length >= 4) {
                e.preventDefault();
                handlePinSubmit(e as any);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [pin]); // Re-attach when pin changes

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (pin.length < 4) {
            setError('PIN must be at least 4 digits');
            return;
        }

        const isValid = await verifyPin(pin);
        if (isValid) {
            onUnlock();
        } else {
            setError('Incorrect PIN');
            setPin('');
        }
    };

    const handleBiometric = async () => {
        setError('');
        const success = await authenticateWithBiometric();
        if (success) {
            onUnlock();
        } else {
            setError('Biometric authentication failed');
        }
    };

    const handlePinInput = (digit: string) => {
        if (pin.length < 6) {
            setPin(pin + digit);
        }
    };

    const handleBackspace = () => {
        setPin(pin.slice(0, -1));
    };

    return (
        <div className="min-h-screen bg-primary flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo/Title */}
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">🔒</div>
                    <h1 className="text-3xl font-bold text-text-primary mb-2">LifeOS</h1>
                    <p className="text-text-secondary">Enter your PIN to unlock</p>
                </div>

                {/* PIN Display */}
                <div className="bg-secondary rounded-lg p-6 mb-6">
                    <div className="flex justify-center gap-3 mb-4">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                            <div
                                key={index}
                                className={`w-4 h-4 rounded-full border-2 transition-all ${
                                    index < pin.length
                                        ? 'bg-accent border-accent'
                                        : 'border-tertiary'
                                }`}
                            />
                        ))}
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm text-center mb-4">
                            {error}
                        </div>
                    )}

                    {/* PIN Keypad */}
                    <form onSubmit={handlePinSubmit}>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                                <button
                                    key={digit}
                                    type="button"
                                    onClick={() => handlePinInput(digit.toString())}
                                    className="bg-tertiary hover:bg-accent text-text-primary font-bold text-2xl py-4 rounded-lg transition-colors"
                                >
                                    {digit}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={handleBackspace}
                                className="bg-tertiary hover:bg-red-600 text-text-primary font-bold py-4 rounded-lg transition-colors"
                            >
                                ⌫
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePinInput('0')}
                                className="bg-tertiary hover:bg-accent text-text-primary font-bold text-2xl py-4 rounded-lg transition-colors"
                            >
                                0
                            </button>
                            <button
                                type="submit"
                                className="bg-accent hover:bg-accent-hover text-white font-bold py-4 rounded-lg transition-colors"
                            >
                                ✓
                            </button>
                        </div>
                    </form>

                    {/* Biometric Button */}
                    {biometricAvailable && (
                        <button
                            onClick={handleBiometric}
                            className="w-full bg-tertiary hover:bg-accent text-text-primary font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="text-2xl">👆</span>
                            <span>Use Biometric</span>
                        </button>
                    )}
                </div>

                {/* Help Text */}
                <div className="text-center text-text-muted text-sm">
                    <p>Forgot your PIN? You'll need to clear app data to reset.</p>
                </div>
            </div>
        </div>
    );
};

export default LockScreen;

