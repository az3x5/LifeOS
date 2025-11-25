import React, { useState, useRef, useEffect } from 'react';

interface QuranAudioPlayerProps {
    chapter: number;
    verse: number;
    reciter: string;
    onPlayStateChange?: (isPlaying: boolean) => void;
    shouldPlay?: boolean;
}

// Popular reciters with their folder names on everyayah.com
export const RECITERS = [
    { id: 'AbdulSamad_64kbps_QuranExplorer.Com', name: 'Abdul Basit Abdul Samad', quality: '64kbps', type: 'verse' },
    { id: 'Alafasy_128kbps', name: 'Mishary Rashid Alafasy', quality: '128kbps', type: 'verse' },
    { id: 'Husary_128kbps', name: 'Mahmoud Khalil Al-Hussary', quality: '128kbps', type: 'verse' },
    { id: 'Minshawy_Murattal_128kbps', name: 'Mohamed Siddiq Al-Minshawi', quality: '128kbps', type: 'verse' },
    { id: 'Ghamadi_40kbps', name: 'Saad Al-Ghamadi', quality: '40kbps', type: 'verse' },
    { id: 'Sudais_128kbps', name: 'Abdul Rahman Al-Sudais', quality: '128kbps', type: 'verse' },
    { id: 'dhivehi', name: 'Dhivehi Translation (Dr. Mohamed Shaheem)', quality: 'Full Surah', type: 'surah' },
];

const QuranAudioPlayer: React.FC<QuranAudioPlayerProps> = ({ chapter, verse, reciter, onPlayStateChange, shouldPlay }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Format chapter and verse to 3 digits (e.g., 001, 002)
    const formatNumber = (num: number): string => num.toString().padStart(3, '0');

    // Get surah name for Dhivehi audio files
    const getSurahFileName = (chapterNum: number): string => {
        const surahNames = [
            'AL-FATIHAH', 'AL-BAQARAH', 'AL-IMRAN', 'AN-NISA', 'AL-MAIDAH', 'AL-ANAM', 'AL-ARAF', 'AL-ANFAL',
            'AT-TAWBAH', 'YUNUS', 'HUD', 'YUSUF', 'AR-RAD', 'IBRAHIM', 'AL-HIJR', 'AN-NAHL', 'AL-ISRA', 'AL-KAHF',
            'MARYAM', 'TAHA', 'AL-ANBYA', 'AL-HAJJ', 'AL-MUMINUN', 'AN-NUR', 'AL-FURQAN', 'ASH-SHUARA', 'AN-NAML',
            'AL-QASAS', 'AL-ANKABUT', 'AR-RUM', 'LUQMAN', 'AS-SAJDAH', 'AL-AHZAB', 'SABA', 'FATIR', 'YA-SIN',
            'AS-SAFFAT', 'SAAD', 'AZ-ZUMAR', 'GHAFIR', 'FUSSILAT', 'ASH-SHURAA', 'AZ-ZUKHRUF', 'AD-DUKHAN',
            'AL-JATHIYAH', 'AL-AHQAF', 'MUHAMMAD', 'AL-FATH', 'AL-HUJURAT', 'QAF', 'ADH-DHARIYAT', 'AT-TUR',
            'AN-NAJM', 'AL-QAMAR', 'AR-RAHMAN', 'AL-WAQIAH', 'AL-HADID', 'AL-MUJADILA', 'AL-HASHR', 'AL-MUMTAHANAH',
            'AS-SAF', 'AL-JUMUAH', 'AL-MUNAFIQUN', 'AT-TAGHABUN', 'AT-TALAQ', 'AT-TAHRIM', 'AL-MULK', 'AL-QALAM',
            'AL-HAQQAH', 'AL-MAARIJ', 'NUH', 'AL-JINN', 'AL-MUZZAMMIL', 'AL-MUDDATHTHIR', 'AL-QIYAMAH', 'AL-INSAN',
            'AL-MURSALAT', 'AN-NABA', 'AN-NAZIAT', 'ABASA', 'AT-TAKWIR', 'AL-INFITAR', 'AL-MUTAFFIFIN', 'AL-INSHIQAQ',
            'AL-BURUJ', 'AT-TARIQ', 'AL-ALA', 'AL-GHASHIYAH', 'AL-FAJR', 'AL-BALAD', 'ASH-SHAMS', 'AL-LAYL',
            'AD-DUHAA', 'ASH-SHARH', 'AT-TIN', 'AL-ALAQ', 'AL-QADR', 'AL-BAYYINAH', 'AZ-ZALZALAH', 'AL-ADIYAT',
            'AL-QARIAH', 'AT-TAKATHUR', 'AL-ASR', 'AL-HUMAZAH', 'AL-FIL', 'QURAYSH', 'AL-MAUN', 'AL-KAWTHAR',
            'AL-KAFIRUN', 'AN-NASR', 'AL-MASAD', 'AL-IKHLAS', 'AL-FALAQ', 'AN-NAS'
        ];
        return `${formatNumber(chapterNum)}${surahNames[chapterNum - 1]}.mp3`;
    };

    // Construct audio URL
    const audioUrl = reciter === 'dhivehi'
        ? `/audio/quran/dhivehi/${getSurahFileName(chapter)}`
        : `https://everyayah.com/data/${reciter}/${formatNumber(chapter)}${formatNumber(verse)}.mp3`;

    // Check if this is a surah-level audio (Dhivehi)
    const isSurahAudio = reciter === 'dhivehi';

    useEffect(() => {
        // Create audio element
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        // Event listeners
        const handleCanPlay = () => {
            setIsLoading(false);
            setError(null);
        };

        const handleError = () => {
            setIsLoading(false);
            setError('Failed to load audio');
            setIsPlaying(false);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            onPlayStateChange?.(false);
        };

        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('error', handleError);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.pause();
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [audioUrl]);

    // Auto-play when shouldPlay becomes true
    useEffect(() => {
        if (shouldPlay && audioRef.current && !isPlaying) {
            setIsLoading(true);
            audioRef.current.play()
                .then(() => {
                    setIsPlaying(true);
                    setIsLoading(false);
                    onPlayStateChange?.(true);
                })
                .catch(() => {
                    setError('Failed to play audio');
                    setIsLoading(false);
                    onPlayStateChange?.(false);
                });
        } else if (!shouldPlay && isPlaying && audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
            onPlayStateChange?.(false);
        }
    }, [shouldPlay]);

    const handlePlayPause = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            onPlayStateChange?.(false);
        } else {
            setIsLoading(true);
            audioRef.current.play()
                .then(() => {
                    setIsPlaying(true);
                    setIsLoading(false);
                    onPlayStateChange?.(true);
                })
                .catch(() => {
                    setError('Failed to play audio');
                    setIsLoading(false);
                    onPlayStateChange?.(false);
                });
        }
    };

    return (
        <div className="flex flex-col gap-1">
            <button
                onClick={handlePlayPause}
                disabled={isLoading || !!error}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    isPlaying
                        ? 'bg-accent text-white'
                        : error
                        ? 'bg-red-500/20 text-red-500 cursor-not-allowed'
                        : 'bg-tertiary text-text-secondary hover:bg-accent hover:text-white'
                }`}
                title={error || (isSurahAudio ? 'Play full surah audio' : 'Play verse audio')}
            >
                <span className="material-symbols-outlined text-base">
                    {isLoading ? 'progress_activity' : isPlaying ? 'pause' : error ? 'error' : 'play_arrow'}
                </span>
                <span>
                    {isLoading ? 'Loading...' : isPlaying ? 'Pause' : error ? 'Error' : 'Play'}
                </span>
            </button>
            {isSurahAudio && (
                <span className="text-xs text-blue-400 italic">
                    🎵 Full Surah Audio
                </span>
            )}
        </div>
    );
};

export default QuranAudioPlayer;

