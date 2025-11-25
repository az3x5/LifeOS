/**
 * Islamic Data Service
 * Loads and manages Islamic data from local JSON files
 */

// Import JSON data
import quranInfo from '../data/islamic/quran-info.json';
import quranArabic from '../data/islamic/quran-arabic.json';
import quranTranslationClear from '../data/islamic/quran-translation-clear.json';
import quranTranslationSahih from '../data/islamic/quran-translation-sahih.json';
import quranTranslationHaleem from '../data/islamic/quran-translation-haleem.json';
import quranDhivehi from '../data/islamic/quran-dhivehi.json';
import quranEditions from '../data/islamic/quran-editions.json';
import hadithBukhari from '../data/islamic/hadith-bukhari-english.json';
import hadithMuslim from '../data/islamic/hadith-muslim-english.json';
import hadithAbuDawud from '../data/islamic/hadith-abudawud-english.json';
import hadithTirmidhi from '../data/islamic/hadith-tirmidhi-english.json';
import hadithNasai from '../data/islamic/hadith-nasai-english.json';
import hadithIbnMajah from '../data/islamic/hadith-ibnmajah-english.json';
import hadithMalik from '../data/islamic/hadith-malik-english.json';
import hadithEditions from '../data/islamic/hadith-editions.json';
import tafsirEditions from '../data/islamic/tafsir-editions.json';
import tafsirIbnKathir from '../data/islamic/tafsir-ibn-kathir-english.json';
import duaCategories from '../data/islamic/dua-categories.json';
import duasComplete from '../data/islamic/duas-dhikr-complete.json';
import duasEnhanced from '../data/islamic/duas-enhanced.json';
import duasComprehensive from '../data/islamic/duas-comprehensive.json';
import prayerTimesData from '../data/islamic/prayer_times.json?raw';
import islandsData from '../data/islamic/islands.json?raw';
import atollsData from '../data/islamic/atolls.json?raw';

// Types
export interface PrayerTime {
    date: string;
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
}

export interface Island {
    island_id: string;
    reg_no: string;
    name_dv: string;
    name_en: string;
    atoll_code: string;
    lng: string;
    lat: string;
    prayer_table_id: string;
}

export interface Atoll {
    atoll_id: string;
    code_letter: string;
    name_abbr_dv: string;
    name_abbr_en: string;
    name_official_dv: string;
    name_official_en: string;
}

export interface QuranSurah {
    chapter: number;
    name: string;
    arabicname: string;
    englishname: string;
    revelationtype: string;
    verses: QuranVerse[];
}

export interface QuranVerse {
    verse: number;
    text: string;
    translationClear?: string;
    translationSahih?: string;
    translationHaleem?: string;
    translationDhivehi?: string;
}

export type HadithCollection = 'bukhari' | 'muslim' | 'abudawud' | 'tirmidhi' | 'nasai' | 'ibnmajah' | 'malik';

export interface HadithCollectionInfo {
    name: string;
    arabicName: string;
    slug: HadithCollection;
    totalHadiths: number;
    description: string;
}

export interface Hadith {
    hadithnumber: number;
    arabicnumber?: string;
    text: string;
    grades?: any[];
    reference?: {
        book: number;
        hadith: number;
    };
}

export interface HadithSection {
    metadata: {
        name: string;
        section: number;
        hadithnumber_first: number;
        hadithnumber_last: number;
    };
    hadiths: Hadith[];
}

export interface Dua {
    id: number;
    title: string;
    arabic: string;
    latin?: string;
    transliteration?: string;
    translation: string;
    notes?: string;
    fawaid?: string;
    source?: string;
    reference?: string;
    benefits?: string;
    time?: string;
    categoryId?: number;
}

export interface DuaCategory {
    category?: string;
    slug: string;
    duas?: Dua[];
    id?: number;
    name?: string;
    icon?: string;
    color?: string;
    description?: string;
}

export interface Tafsir {
    chapter: number;
    verse: number;
    text: string;
}

class IslamicDataService {
    // Cache for processed surahs
    private surahsCache: QuranSurah[] | null = null;

    // Quran methods
    getQuranInfo() {
        // Return stats in the format expected by the component
        const info = quranInfo as any;
        return {
            chapters: info.chapters?.length || 114,
            verses: info.verses?.count || 6236,
            juzs: 30,
            pages: 604
        };
    }

    getQuranSurahs(): QuranSurah[] {
        // Return cached surahs if available
        if (this.surahsCache) {
            return this.surahsCache;
        }

        // Combine quran-info metadata with quran-arabic text and translations
        const chapters = (quranInfo as any).chapters || [];
        const arabicVerses = (quranArabic as any).quran || [];
        const clearVerses = (quranTranslationClear as any).quran || [];
        const sahihVerses = (quranTranslationSahih as any).quran || [];
        const haleemVerses = (quranTranslationHaleem as any).quran || [];

        // Parse Dhivehi translation (different structure)
        const dhivehiData = (quranDhivehi as any).data || {};
        const dhivehiVerses: any[] = [];
        Object.keys(dhivehiData).forEach(surahNum => {
            const surah = parseInt(surahNum);
            dhivehiData[surahNum].forEach((v: any) => {
                dhivehiVerses.push({ chapter: surah, verse: v.verse, text: v.text });
            });
        });

        // Create lookup maps for faster access
        const clearMap = new Map(clearVerses.map((v: any) => [`${v.chapter}:${v.verse}`, v.text]));
        const sahihMap = new Map(sahihVerses.map((v: any) => [`${v.chapter}:${v.verse}`, v.text]));
        const haleemMap = new Map(haleemVerses.map((v: any) => [`${v.chapter}:${v.verse}`, v.text]));
        const dhivehiMap = new Map(dhivehiVerses.map((v: any) => [`${v.chapter}:${v.verse}`, v.text]));

        this.surahsCache = chapters.map((chapter: any) => {
            const chapterNumber = chapter.chapter;
            const chapterVerses = arabicVerses
                .filter((v: any) => v.chapter === chapterNumber)
                .map((v: any) => {
                    const verseKey = `${v.chapter}:${v.verse}`;
                    return {
                        verse: v.verse,
                        text: v.text,
                        translationClear: clearMap.get(verseKey),
                        translationSahih: sahihMap.get(verseKey),
                        translationHaleem: haleemMap.get(verseKey),
                        translationDhivehi: dhivehiMap.get(verseKey)
                    };
                });

            return {
                chapter: chapterNumber,
                name: chapter.name,
                arabicname: chapter.arabicname,
                englishname: chapter.englishname,
                revelationtype: chapter.revelation,
                verses: chapterVerses
            };
        });

        return this.surahsCache;
    }

    getSurahByNumber(surahNumber: number): QuranSurah | undefined {
        const surahs = this.getQuranSurahs();
        return surahs.find(s => s.chapter === surahNumber);
    }

    getVerseByReference(surahNumber: number, verseNumber: number): QuranVerse | undefined {
        const surah = this.getSurahByNumber(surahNumber);
        return surah?.verses.find(v => v.verse === verseNumber);
    }

    getQuranEditions() {
        return quranEditions;
    }

    // Hadith methods
    getHadithCollections(): HadithCollectionInfo[] {
        return [
            {
                name: 'Sahih Bukhari',
                arabicName: 'صحيح البخاري',
                slug: 'bukhari',
                totalHadiths: 7008,
                description: 'The most authentic hadith collection compiled by Imam Bukhari'
            },
            {
                name: 'Sahih Muslim',
                arabicName: 'صحيح مسلم',
                slug: 'muslim',
                totalHadiths: 7190,
                description: 'The second most authentic hadith collection compiled by Imam Muslim'
            },
            {
                name: 'Sunan Abu Dawud',
                arabicName: 'سنن أبي داود',
                slug: 'abudawud',
                totalHadiths: 5274,
                description: 'Collection focusing on legal hadiths compiled by Imam Abu Dawud'
            },
            {
                name: "Jami' at-Tirmidhi",
                arabicName: 'جامع الترمذي',
                slug: 'tirmidhi',
                totalHadiths: 3956,
                description: 'Comprehensive collection with grading by Imam Tirmidhi'
            },
            {
                name: "Sunan an-Nasa'i",
                arabicName: 'سنن النسائي',
                slug: 'nasai',
                totalHadiths: 5758,
                description: 'Collection of authentic hadiths compiled by Imam an-Nasa\'i'
            },
            {
                name: 'Sunan Ibn Majah',
                arabicName: 'سنن ابن ماجه',
                slug: 'ibnmajah',
                totalHadiths: 4341,
                description: 'One of the six major hadith collections by Imam Ibn Majah'
            },
            {
                name: 'Muwatta Malik',
                arabicName: 'موطأ مالك',
                slug: 'malik',
                totalHadiths: 1594,
                description: 'The earliest written collection of hadith by Imam Malik'
            }
        ];
    }

    private getHadithData(collection: HadithCollection): any {
        switch (collection) {
            case 'bukhari': return hadithBukhari;
            case 'muslim': return hadithMuslim;
            case 'abudawud': return hadithAbuDawud;
            case 'tirmidhi': return hadithTirmidhi;
            case 'nasai': return hadithNasai;
            case 'ibnmajah': return hadithIbnMajah;
            case 'malik': return hadithMalik;
            default: return hadithBukhari;
        }
    }

    getHadithSections(collection: HadithCollection): HadithSection[] {
        const data = this.getHadithData(collection) as any;
        const sections = data.metadata?.sections || {};
        const sectionDetails = data.metadata?.section_details || {};
        const hadiths = data.hadiths || [];

        return Object.keys(sections).map(sectionNum => {
            const sectionNumber = parseInt(sectionNum);
            const details = sectionDetails[sectionNum] || {};
            const sectionHadiths = hadiths.filter((h: any) =>
                h.hadithnumber >= details.hadithnumber_first &&
                h.hadithnumber <= details.hadithnumber_last
            );

            return {
                metadata: {
                    name: sections[sectionNum],
                    section: sectionNumber,
                    hadithnumber_first: details.hadithnumber_first || 0,
                    hadithnumber_last: details.hadithnumber_last || 0
                },
                hadiths: sectionHadiths
            };
        }).filter(section => section.hadiths.length > 0);
    }

    searchHadith(collection: HadithCollection, query: string): Hadith[] {
        const data = this.getHadithData(collection) as any;
        const hadiths = data.hadiths || [];
        const lowerQuery = query.toLowerCase();

        return hadiths.filter((hadith: any) =>
            hadith.text?.toLowerCase().includes(lowerQuery)
        );
    }

    // Legacy methods for backward compatibility
    getHadithBukhariSections(): HadithSection[] {
        return this.getHadithSections('bukhari');
    }

    getHadithMuslimSections(): HadithSection[] {
        return this.getHadithSections('muslim');
    }

    searchHadithBukhari(query: string): Hadith[] {
        return this.searchHadith('bukhari', query);
    }

    searchHadithMuslim(query: string): Hadith[] {
        return this.searchHadith('muslim', query);
    }

    getHadithEditions() {
        return hadithEditions;
    }

    // Tafsir methods
    getTafsirEditions() {
        return tafsirEditions;
    }

    // Dua methods
    getDuaCategories(): DuaCategory[] {
        // Return comprehensive categories (25 categories)
        return (duasComprehensive as any).categories || [];
    }

    getAllDuas(): Dua[] {
        // Return all duas from comprehensive collection (82+ duas)
        return (duasComprehensive as any).duas || [];
    }

    getDuasByCategory(slug: string): Dua[] {
        // Get category ID from slug
        const categories = (duasComprehensive as any).categories || [];
        const category = categories.find((c: any) => c.slug === slug);

        if (!category) return [];

        // Get all duas for this category
        const allDuas = (duasComprehensive as any).duas || [];
        return allDuas.filter((dua: any) => dua.categoryId === category.id);
    }

    getDuasByCategoryId(categoryId: number): Dua[] {
        const allDuas = (duasComprehensive as any).duas || [];
        return allDuas.filter((dua: any) => dua.categoryId === categoryId);
    }

    searchDuas(query: string): Dua[] {
        const results: Dua[] = [];
        const lowerQuery = query.toLowerCase();
        const allDuas = (duasComprehensive as any).duas || [];

        allDuas.forEach((dua: any) => {
            if (
                dua.title?.toLowerCase().includes(lowerQuery) ||
                dua.translation?.toLowerCase().includes(lowerQuery) ||
                dua.transliteration?.toLowerCase().includes(lowerQuery) ||
                dua.arabic?.includes(query) ||
                dua.reference?.toLowerCase().includes(lowerQuery) ||
                dua.benefits?.toLowerCase().includes(lowerQuery)
            ) {
                results.push(dua);
            }
        });

        return results;
    }

    getDuaMetadata() {
        return (duasComprehensive as any).metadata || {};
    }

    /**
     * Get tafsir (commentary) for a specific verse
     * @param chapter Surah number (1-114)
     * @param verse Verse number
     * @returns Tafsir text or undefined if not available
     */
    getTafsirForVerse(chapter: number, verse: number): string | undefined {
        const tafsirs = (tafsirIbnKathir as any).tafsirs || [];
        const tafsir = tafsirs.find((t: any) => t.chapter === chapter && t.verse === verse);
        return tafsir?.text;
    }

    /**
     * Check if tafsir is available for a specific surah
     * @param chapter Surah number (1-114)
     * @returns True if tafsir is available for this surah
     */
    hasTafsirForSurah(chapter: number): boolean {
        const tafsirs = (tafsirIbnKathir as any).tafsirs || [];
        return tafsirs.some((t: any) => t.chapter === chapter);
    }

    // Prayer time methods
    getPrayerTimesByDate(date: string, islandReg: string = 'K01'): PrayerTime | null {
        try {
            const dateObj = new Date(date);
            const day = dateObj.getDate().toString();
            const month = (dateObj.getMonth() + 1).toString();

            // Parse NDJSON format - data is imported as raw string
            const lines = prayerTimesData.split('\n').filter((line: string) => line.trim());

            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    if (entry.day === day && entry.month === month && entry.island_reg === islandReg) {
                        return {
                            date,
                            fajr: entry.fajr,
                            sunrise: entry.sunrise,
                            dhuhr: entry.duhr,
                            asr: entry.asr,
                            maghrib: entry.maghrib,
                            isha: entry.isha
                        };
                    }
                } catch (e) {
                    // Skip invalid JSON lines
                    continue;
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting prayer times:', error);
            return null;
        }
    }

    getAllIslands(): Island[] {
        try {
            // Parse NDJSON format - data is imported as raw string
            const lines = islandsData.split('\n').filter((line: string) => line.trim());
            return lines.map((line: string) => {
                const data = JSON.parse(line);
                return {
                    island_id: data.island_id,
                    reg_no: data.reg_no,
                    name_dv: data.name_dv,
                    name_en: data.name_en,
                    atoll_code: data.atoll_code,
                    lng: data.lng,
                    lat: data.lat,
                    prayer_table_id: data.prayer_table_id
                };
            });
        } catch (error) {
            console.error('Error loading islands:', error);
            return [];
        }
    }

    getAllAtolls(): Atoll[] {
        try {
            // Parse NDJSON format - data is imported as raw string
            const lines = atollsData.split('\n').filter((line: string) => line.trim());
            return lines.map((line: string) => {
                const data = JSON.parse(line);
                return {
                    atoll_id: data.atoll_id,
                    code_letter: data.code_letter,
                    name_abbr_dv: data.name_abbr_dv,
                    name_abbr_en: data.name_abbr_en,
                    name_official_dv: data.name_official_dv,
                    name_official_en: data.name_official_en
                };
            });
        } catch (error) {
            console.error('Error loading atolls:', error);
            return [];
        }
    }

    getIslandByRegNo(regNo: string): Island | null {
        const islands = this.getAllIslands();
        return islands.find(i => i.reg_no === regNo) || null;
    }
}

export const islamicDataService = new IslamicDataService();

