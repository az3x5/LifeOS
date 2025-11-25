import { useState, useEffect, useCallback } from 'react';

interface SpeechOptions {
    rate?: number;
    pitch?: number;
    volume?: number;
    lang?: string;
}

/**
 * Hook for Arabic text-to-speech using Web Speech API
 * Supports Arabic and other languages
 */
export const useArabicSpeech = () => {
    const [isSupported, setIsSupported] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [arabicVoices, setArabicVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        // Check if speech synthesis is supported
        if ('speechSynthesis' in window) {
            setIsSupported(true);

            // Load voices
            const loadVoices = () => {
                const availableVoices = window.speechSynthesis.getVoices();
                setVoices(availableVoices);
                
                // Filter Arabic voices
                const arabic = availableVoices.filter(voice => 
                    voice.lang.startsWith('ar') || voice.lang.includes('ar-')
                );
                setArabicVoices(arabic);
            };

            loadVoices();
            
            // Voices may load asynchronously
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }
        }

        return () => {
            // Cleanup
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const speak = useCallback((text: string, options: SpeechOptions = {}) => {
        if (!isSupported || !text) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set language (default to Arabic)
        utterance.lang = options.lang || 'ar-SA';
        
        // Set voice if Arabic voice is available
        if (arabicVoices.length > 0) {
            utterance.voice = arabicVoices[0];
        }
        
        // Set speech parameters
        utterance.rate = options.rate || 0.8; // Slower for better pronunciation
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;

        // Event handlers
        utterance.onstart = () => {
            setIsSpeaking(true);
            setIsPaused(false);
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            setIsPaused(false);
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            setIsSpeaking(false);
            setIsPaused(false);
        };

        utterance.onpause = () => {
            setIsPaused(true);
        };

        utterance.onresume = () => {
            setIsPaused(false);
        };

        window.speechSynthesis.speak(utterance);
    }, [isSupported, arabicVoices]);

    const pause = useCallback(() => {
        if (isSupported && isSpeaking) {
            window.speechSynthesis.pause();
            setIsPaused(true);
        }
    }, [isSupported, isSpeaking]);

    const resume = useCallback(() => {
        if (isSupported && isPaused) {
            window.speechSynthesis.resume();
            setIsPaused(false);
        }
    }, [isSupported, isPaused]);

    const stop = useCallback(() => {
        if (isSupported) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setIsPaused(false);
        }
    }, [isSupported]);

    return {
        isSupported,
        isSpeaking,
        isPaused,
        voices,
        arabicVoices,
        speak,
        pause,
        resume,
        stop,
    };
};

