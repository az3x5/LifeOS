import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Dhivehi translation file
const dhivehiFile = path.join(__dirname, '../data/islamic/quran-dhivehi.txt');
const outputFile = path.join(__dirname, '../data/islamic/quran-dhivehi.json');

console.log('📖 Parsing Dhivehi Quran Translation...\n');

try {
    const content = fs.readFileSync(dhivehiFile, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const verses = [];
    let currentSurah = 1;
    let verseCount = 0;
    
    for (const line of lines) {
        const parts = line.split('|');
        if (parts.length >= 3) {
            const surah = parseInt(parts[0]);
            const verse = parseInt(parts[1]);
            const text = parts[2].trim();
            
            if (surah && verse && text) {
                verses.push({
                    surah,
                    verse,
                    text
                });
                
                if (surah !== currentSurah) {
                    console.log(`✅ Surah ${currentSurah}: ${verseCount} verses`);
                    currentSurah = surah;
                    verseCount = 0;
                }
                verseCount++;
            }
        }
    }
    
    console.log(`✅ Surah ${currentSurah}: ${verseCount} verses\n`);
    
    // Group by surah
    const quranData = {};
    for (const verse of verses) {
        if (!quranData[verse.surah]) {
            quranData[verse.surah] = [];
        }
        quranData[verse.surah].push({
            verse: verse.verse,
            text: verse.text
        });
    }
    
    const output = {
        metadata: {
            name: 'Dhivehi Translation',
            language: 'dv',
            languageName: 'Dhivehi (ދިވެހި)',
            translator: 'Office of the President of Maldives',
            source: 'https://presidency.gov.mv/quran',
            totalVerses: verses.length,
            totalSurahs: Object.keys(quranData).length
        },
        data: quranData
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf-8');
    
    console.log('✅ Successfully parsed Dhivehi Quran translation!');
    console.log(`📊 Total Surahs: ${output.metadata.totalSurahs}`);
    console.log(`📊 Total Verses: ${output.metadata.totalVerses}`);
    console.log(`💾 Saved to: ${outputFile}\n`);
    
} catch (error) {
    console.error('❌ Error parsing Dhivehi Quran:', error.message);
    process.exit(1);
}

