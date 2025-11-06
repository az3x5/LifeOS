import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Listen for the beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            
            // Show prompt after 30 seconds or on user interaction
            setTimeout(() => {
                const dismissed = localStorage.getItem('pwa-install-dismissed');
                if (!dismissed) {
                    setShowPrompt(true);
                }
            }, 30000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Listen for successful installation
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        await deferredPrompt.prompt();

        // Wait for the user's response
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        // Clear the deferred prompt
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-install-dismissed', 'true');
    };

    const handleShowPrompt = () => {
        setShowPrompt(true);
    };

    // Don't show anything if already installed
    if (isInstalled) {
        return null;
    }

    // Don't show install button - removed per user request

    if (!showPrompt) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-secondary border-2 border-accent rounded-lg shadow-2xl p-4 z-50 animate-fade-in-up">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-text-primary mb-1">
                        Install LifeOS
                    </h3>
                    <p className="text-sm text-text-secondary mb-3">
                        Install LifeOS on your device for quick access and offline use!
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={handleInstallClick}
                            className="flex-1 bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            Install
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="px-4 py-2 text-text-muted hover:text-text-primary transition-colors"
                        >
                            Not now
                        </button>
                    </div>
                </div>
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;

