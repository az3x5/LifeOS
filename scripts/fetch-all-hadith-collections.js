import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data', 'islamic');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

console.log('🚀 Starting hadith collections download...\n');

// Hadith collections available from the API
// Based on https://github.com/fawazahmed0/hadith-api
const hadithCollections = [
    { name: 'Sahih Bukhari', slug: 'bukhari', arabicName: 'صحيح البخاري', totalHadiths: 7008 },
    { name: 'Sahih Muslim', slug: 'muslim', arabicName: 'صحيح مسلم', totalHadiths: 7190 },
    { name: 'Sunan Abu Dawud', slug: 'abudawud', arabicName: 'سنن أبي داود', totalHadiths: 5274 },
    { name: "Jami' at-Tirmidhi", slug: 'tirmidhi', arabicName: 'جامع الترمذي', totalHadiths: 3956 },
    { name: 'Sunan an-Nasa\'i', slug: 'nasai', arabicName: 'سنن النسائي', totalHadiths: 5758 },
    { name: 'Sunan Ibn Majah', slug: 'ibnmajah', arabicName: 'سنن ابن ماجه', totalHadiths: 4341 },
    { name: 'Muwatta Malik', slug: 'malik', arabicName: 'موطأ مالك', totalHadiths: 1594 },
    { name: 'Musnad Ahmad', slug: 'ahmad', arabicName: 'مسند أحمد', totalHadiths: 26363 },
    { name: 'Sunan ad-Darimi', slug: 'darimi', arabicName: 'سنن الدارمي', totalHadiths: 3367 },
    { name: "An-Nawawi's 40 Hadith", slug: 'nawawi40', arabicName: 'الأربعون النووية', totalHadiths: 42 },
    { name: 'Riyad as-Salihin', slug: 'riyadussalihin', arabicName: 'رياض الصالحين', totalHadiths: 1896 },
    { name: 'Al-Adab Al-Mufrad', slug: 'adab', arabicName: 'الأدب المفرد', totalHadiths: 1322 },
    { name: 'Ash-Shama\'il Al-Muhammadiyah', slug: 'shamail', arabicName: 'الشمائل المحمدية', totalHadiths: 397 },
    { name: 'Mishkat al-Masabih', slug: 'mishkat', arabicName: 'مشكاة المصابيح', totalHadiths: 5945 },
    { name: 'Bulugh al-Maram', slug: 'bulugh', arabicName: 'بلوغ المرام', totalHadiths: 1358 },
    { name: 'Hisn al-Muslim', slug: 'hisnulmuslim', arabicName: 'حصن المسلم', totalHadiths: 133 }
];

console.log(`📚 Found ${hadithCollections.length} hadith collections to download\n`);

// Base URL for hadith API (using jsDelivr CDN)
const baseUrl = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';

// Function to download a hadith collection
async function downloadHadithCollection(collection) {
    const { name, slug, arabicName, totalHadiths } = collection;
    
    console.log(`📖 Downloading ${name} (${arabicName})...`);
    console.log(`   Total Hadiths: ${totalHadiths.toLocaleString()}`);
    
    try {
        // Download English edition
        const englishUrl = `${baseUrl}/editions/eng-${slug}.json`;
        const englishResponse = await fetch(englishUrl);
        
        if (!englishResponse.ok) {
            console.log(`   ❌ Failed to download English edition: ${englishResponse.status}`);
            return false;
        }
        
        const englishData = await englishResponse.json();
        const englishPath = path.join(dataDir, `hadith-${slug}-english.json`);
        fs.writeFileSync(englishPath, JSON.stringify(englishData, null, 2), 'utf8');
        console.log(`   ✅ English edition saved (${(fs.statSync(englishPath).size / 1024 / 1024).toFixed(2)} MB)`);
        
        return true;
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return false;
    }
}

// Download all collections
async function downloadAllCollections() {
    let successCount = 0;
    let failCount = 0;
    
    for (const collection of hadithCollections) {
        const success = await downloadHadithCollection(collection);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
        console.log(''); // Empty line for readability
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Successfully downloaded: ${successCount} collections`);
    console.log(`❌ Failed: ${failCount} collections`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Calculate total hadiths
    const totalHadiths = hadithCollections.reduce((sum, c) => sum + c.totalHadiths, 0);
    console.log(`📊 Total Hadiths Available: ${totalHadiths.toLocaleString()}`);
    console.log(`📁 Saved to: ${dataDir}\n`);
    
    console.log('🎉 Hadith collections download complete!');
}

// Run the download
downloadAllCollections().catch(console.error);

