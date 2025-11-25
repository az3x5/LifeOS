import React, { useState, useMemo } from 'react';
import { useArabicSpeech } from '../../hooks/useArabicSpeech';

// Import HadithMV data
import metadata from '../../data/islamic/hadithmv/metadata.json';
import muwattaMalik from '../../data/islamic/hadithmv/muwattaMalik.json';
import arbaoonNawawi from '../../data/islamic/hadithmv/arbaoonNawawi.json';
import bulughulMaram from '../../data/islamic/hadithmv/bulughulMaram.json';
import umdathulAhkam from '../../data/islamic/hadithmv/umdathulAhkam.json';
import hisnulMuslim from '../../data/islamic/hadithmv/hisnulMuslim.json';
import kitabulIlmAbiKhaithama from '../../data/islamic/hadithmv/kitabulIlmAbiKhaithama.json';

// Type definitions
type HadithArray = [
  string,  // 0: Hadith number
  string,  // 1: Title (Arabic)
  string,  // 2: Chapter (Arabic)
  string,  // 3: Chapter (Dhivehi)
  string,  // 4: Arabic text
  string,  // 5: Dhivehi translation
  string,  // 6: Reference (Arabic)
  string   // 7: Reference (Dhivehi)
];

interface HadithBook {
  id: string;
  name: string;
  arabicName: string;
  data: HadithArray[];
}

const HADITH_BOOKS: HadithBook[] = [
  { id: 'muwattaMalik', name: "Muwatta Malik", arabicName: 'موطأ مالك', data: muwattaMalik as HadithArray[] },
  { id: 'arbaoonNawawi', name: "Nawawi's 40 Hadith", arabicName: 'الأربعون النووية', data: arbaoonNawawi as HadithArray[] },
  { id: 'bulughulMaram', name: 'Bulughul Maram', arabicName: 'بلوغ المرام', data: bulughulMaram as HadithArray[] },
  { id: 'umdathulAhkam', name: 'Umdatul Ahkam', arabicName: 'عمدة الأحكام', data: umdathulAhkam as HadithArray[] },
  { id: 'hisnulMuslim', name: 'Hisn al-Muslim', arabicName: 'حصن المسلم', data: hisnulMuslim as HadithArray[] },
  { id: 'kitabulIlmAbiKhaithama', name: "Abu Khaithama's Book of Knowledge", arabicName: 'كتاب العلم', data: kitabulIlmAbiKhaithama as HadithArray[] },
];

export const HadithMVBrowser: React.FC = () => {
  const [selectedBook, setSelectedBook] = useState<string>('arbaoonNawawi');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHadith, setSelectedHadith] = useState<HadithArray | null>(null);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  
  const { speak, stop, isSpeaking } = useArabicSpeech();

  // Get current book
  const currentBook = useMemo(() => {
    return HADITH_BOOKS.find(book => book.id === selectedBook);
  }, [selectedBook]);

  // Filter hadiths based on search
  const filteredHadiths = useMemo(() => {
    if (!currentBook) return [];
    if (!searchQuery.trim()) return currentBook.data;

    const query = searchQuery.toLowerCase();
    return currentBook.data.filter(hadith => {
      const arabicText = hadith[4]?.toLowerCase() || '';
      const dhivehiText = hadith[5]?.toLowerCase() || '';
      const chapterArabic = hadith[2]?.toLowerCase() || '';
      const chapterDhivehi = hadith[3]?.toLowerCase() || '';
      
      return arabicText.includes(query) || 
             dhivehiText.includes(query) || 
             chapterArabic.includes(query) || 
             chapterDhivehi.includes(query);
    });
  }, [currentBook, searchQuery]);

  // Handle audio playback
  const handlePlayAudio = (hadith: HadithArray) => {
    const hadithId = `${selectedBook}-${hadith[0]}`;
    
    if (currentPlayingId === hadithId && isSpeaking) {
      stop();
      setCurrentPlayingId(null);
    } else {
      stop();
      const arabicText = hadith[4];
      speak(arabicText, { rate: 0.7 });
      setCurrentPlayingId(hadithId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-4xl text-emerald-600 dark:text-emerald-400">
            menu_book
          </span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              HadithMV - Dhivehi Hadith Collection
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {metadata.totalBooks} books • {metadata.books.reduce((sum, book) => sum + book.totalHadiths, 0)} hadiths with Dhivehi translations
            </p>
          </div>
        </div>

        {/* Book Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {HADITH_BOOKS.map(book => (
            <button
              key={book.id}
              onClick={() => {
                setSelectedBook(book.id);
                setSelectedHadith(null);
                setSearchQuery('');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedBook === book.id
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <div className="text-sm">{book.name}</div>
              <div className="text-xs opacity-80">{book.arabicName}</div>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in Arabic or Dhivehi..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredHadiths.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">
              search_off
            </span>
            <p className="text-gray-500 dark:text-gray-400">No hadiths found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHadiths.map((hadith, index) => (
              <HadithCard
                key={`${selectedBook}-${hadith[0]}-${index}`}
                hadith={hadith}
                bookId={selectedBook}
                onPlayAudio={() => handlePlayAudio(hadith)}
                isPlaying={currentPlayingId === `${selectedBook}-${hadith[0]}` && isSpeaking}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Hadith Card Component
interface HadithCardProps {
  hadith: HadithArray;
  bookId: string;
  onPlayAudio: () => void;
  isPlaying: boolean;
}

const HadithCard: React.FC<HadithCardProps> = ({ hadith, bookId, onPlayAudio, isPlaying }) => {
  const [showArabicNotes, setShowArabicNotes] = useState(false);
  const [showDhivehiNotes, setShowDhivehiNotes] = useState(false);

  const hadithNumber = hadith[0];
  const title = hadith[1];
  const chapterArabic = hadith[2];
  const chapterDhivehi = hadith[3];
  const arabicText = hadith[4];
  const dhivehiText = hadith[5];
  const arabicNotes = hadith[6];
  const dhivehiNotes = hadith[7];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg px-3 py-1">
              <span className="font-bold">#{hadithNumber}</span>
            </div>
            <div>
              {title && (
                <div className="font-arabic text-lg font-semibold">{title}</div>
              )}
              {chapterArabic && (
                <div className="font-arabic text-sm opacity-90">{chapterArabic}</div>
              )}
              {chapterDhivehi && (
                <div className="font-dhivehi text-sm opacity-90">{chapterDhivehi}</div>
              )}
            </div>
          </div>

          {/* Audio Button */}
          <button
            onClick={onPlayAudio}
            className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
            title={isPlaying ? "Stop Audio" : "Play Audio"}
          >
            <span className="material-symbols-outlined">
              {isPlaying ? 'stop' : 'play_arrow'}
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Arabic Text */}
        {arabicText && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <span className="material-symbols-outlined text-lg">translate</span>
              <span>Arabic Text</span>
            </div>
            <div className="font-arabic text-xl leading-loose text-right bg-amber-50 dark:bg-gray-700/50 p-4 rounded-lg">
              {arabicText}
            </div>
          </div>
        )}

        {/* Dhivehi Translation */}
        {dhivehiText && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <span className="material-symbols-outlined text-lg">language</span>
              <span>Dhivehi Translation</span>
            </div>
            <div className="font-dhivehi text-lg leading-relaxed text-right bg-blue-50 dark:bg-gray-700/50 p-4 rounded-lg">
              {dhivehiText}
            </div>
          </div>
        )}

        {/* Arabic Notes (Collapsible) */}
        {arabicNotes && arabicNotes.trim() && (
          <div className="space-y-2">
            <button
              onClick={() => setShowArabicNotes(!showArabicNotes)}
              className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              <span className="material-symbols-outlined text-lg">
                {showArabicNotes ? 'expand_less' : 'expand_more'}
              </span>
              <span>Arabic Reference & Notes</span>
            </button>
            {showArabicNotes && (
              <div className="font-arabic text-sm leading-loose text-right bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border-l-4 border-emerald-500">
                {arabicNotes}
              </div>
            )}
          </div>
        )}

        {/* Dhivehi Notes (Collapsible) */}
        {dhivehiNotes && dhivehiNotes.trim() && (
          <div className="space-y-2">
            <button
              onClick={() => setShowDhivehiNotes(!showDhivehiNotes)}
              className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              <span className="material-symbols-outlined text-lg">
                {showDhivehiNotes ? 'expand_less' : 'expand_more'}
              </span>
              <span>Dhivehi Reference & Notes</span>
            </button>
            {showDhivehiNotes && (
              <div className="font-dhivehi text-sm leading-relaxed text-right bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border-l-4 border-emerald-500">
                {dhivehiNotes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

