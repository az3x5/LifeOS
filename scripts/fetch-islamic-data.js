/**
 * Script to fetch and store Islamic data from various APIs
 * - Quran API: https://github.com/fawazahmed0/quran-api
 * - Hadith API: https://github.com/fawazahmed0/hadith-api
 * - Tafsir API: https://github.com/spa5k/tafsir_api
 * - Dua/Dhikr API: https://github.com/fitrahive/dua-dhikr
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data', 'islamic');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper function to fetch JSON data
function fetchJSON(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            headers: headers
        };

        https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Helper function to save JSON file
function saveJSON(filename, data) {
    const filepath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`✅ Saved: ${filename}`);
}

async function fetchQuranData() {
    console.log('\n📖 Fetching Quran Data...');

    try {
        // Fetch editions list
        const editions = await fetchJSON('https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions.json');
        saveJSON('quran-editions.json', editions);

        // Fetch Quran info
        const info = await fetchJSON('https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/info.json');
        saveJSON('quran-info.json', info);

        // Fetch Arabic Quran - try alternative CDN
        console.log('Fetching Arabic Quran...');
        try {
            const arabicQuran = await fetchJSON('https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/ara-quranindopak.json');
            saveJSON('quran-arabic.json', arabicQuran);
        } catch (e) {
            console.log('⚠️ Could not fetch full Arabic Quran, will use surah info from quran-info.json');
        }

        // Fetch English translation (Sahih International)
        console.log('Fetching English translation...');
        try {
            const englishQuran = await fetchJSON('https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/eng-sahih.json');
            saveJSON('quran-english.json', englishQuran);
        } catch (e) {
            console.log('⚠️ Could not fetch English translation');
        }

        console.log('✅ Quran data fetched successfully!');
    } catch (error) {
        console.error('❌ Error fetching Quran data:', error.message);
    }
}

async function fetchHadithData() {
    console.log('\n📚 Fetching Hadith Data...');
    
    try {
        // Fetch editions list
        const editions = await fetchJSON('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.json');
        saveJSON('hadith-editions.json', editions);
        
        // Fetch Hadith info
        const info = await fetchJSON('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/info.json');
        saveJSON('hadith-info.json', info);
        
        // Fetch Sahih Bukhari (English)
        console.log('Fetching Sahih Bukhari...');
        const bukhari = await fetchJSON('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari.json');
        saveJSON('hadith-bukhari-english.json', bukhari);
        
        // Fetch Sahih Muslim (English)
        console.log('Fetching Sahih Muslim...');
        const muslim = await fetchJSON('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-muslim.json');
        saveJSON('hadith-muslim-english.json', muslim);
        
        console.log('✅ Hadith data fetched successfully!');
    } catch (error) {
        console.error('❌ Error fetching Hadith data:', error.message);
    }
}

async function fetchTafsirData() {
    console.log('\n📝 Fetching Tafsir Data...');

    try {
        // Fetch tafsir editions list
        console.log('Fetching Tafsir editions...');
        const editions = await fetchJSON('https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/editions.json');
        saveJSON('tafsir-editions.json', editions);

        // Fetch English tafsir (Ibn Kathir - abridged)
        console.log('Fetching English Tafsir (Ibn Kathir)...');
        const tafsirData = {
            edition: 'en-tafisr-ibn-kathir',
            surahs: []
        };

        // Fetch first 5 surahs as sample (full download would be too large)
        for (let i = 1; i <= 5; i++) {
            try {
                const surah = await fetchJSON(`https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/en-tafisr-ibn-kathir/${i}.json`);
                tafsirData.surahs.push(surah);
                console.log(`  ✓ Surah ${i} fetched`);
            } catch (e) {
                console.log(`  ✗ Surah ${i} failed`);
            }
        }

        saveJSON('tafsir-ibn-kathir-sample.json', tafsirData);
        console.log('✅ Tafsir data fetched successfully (sample)!');
        console.log('Note: Full tafsir can be fetched on-demand from: https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/');

    } catch (error) {
        console.error('❌ Error fetching Tafsir data:', error.message);
    }
}

async function fetchDuaDhikrData() {
    console.log('\n🤲 Fetching Dua & Dhikr Data...');

    try {
        const headers = { 'Accept-Language': 'en' };

        // Fetch categories list
        console.log('Fetching categories...');
        const categories = await fetchJSON('https://dua-dhikr.vercel.app/categories', headers);
        saveJSON('dua-categories.json', categories);

        // Fetch all duas from each category
        const allDuas = [];

        if (categories.data && Array.isArray(categories.data)) {
            for (const category of categories.data) {
                console.log(`Fetching duas from category: ${category.name}...`);
                try {
                    const categoryDuas = await fetchJSON(`https://dua-dhikr.vercel.app/categories/${category.slug}`, headers);
                    if (categoryDuas.data) {
                        allDuas.push({
                            category: category.name,
                            slug: category.slug,
                            duas: categoryDuas.data
                        });
                        console.log(`  ✓ ${categoryDuas.data.length} duas fetched`);
                    }
                } catch (e) {
                    console.log(`  ✗ Failed to fetch ${category.name}: ${e.message}`);
                }
            }

            saveJSON('duas-dhikr-complete.json', allDuas);
            console.log('✅ Dua & Dhikr data fetched successfully!');
        } else {
            console.log('⚠️ No categories found in response');
        }
    } catch (error) {
        console.error('❌ Error fetching Dua & Dhikr data:', error.message);
        console.log('Note: API endpoint: https://dua-dhikr.vercel.app');
    }
}

// Main execution
async function main() {
    console.log('🚀 Starting Islamic Data Fetch...\n');
    console.log(`📁 Data will be saved to: ${DATA_DIR}\n`);
    
    await fetchQuranData();
    await fetchHadithData();
    await fetchTafsirData();
    await fetchDuaDhikrData();
    
    console.log('\n✅ All done! Islamic data has been downloaded and stored locally.');
    console.log(`📁 Check the data directory: ${DATA_DIR}`);
}

main().catch(console.error);

