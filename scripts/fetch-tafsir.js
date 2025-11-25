/**
 * Script to fetch Tafsir Ibn Kathir (English) from spa5k/tafsir_api
 * Run with: node scripts/fetch-tafsir.js
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'islamic');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'tafsir-ibn-kathir-english.json');

// Base URL for tafsir API
const BASE_URL = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/en-tafisr-ibn-kathir';

// Delay between requests (ms)
const DELAY_MS = 50;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper function to download JSON from URL
function downloadJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                return downloadJSON(response.headers.location).then(resolve).catch(reject);
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`Failed: ${response.statusCode}`));
                return;
            }

            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Helper to delay execution
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Verse counts per surah
const VERSE_COUNTS = [
    7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
    112, 78, 118, 64, 77, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89,
    59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12,
    30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30,
    20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6
];

async function main() {
    console.log('📖 Fetching Tafsir Ibn Kathir (English)...\n');

    // Fetch popular surahs first (1, 2, 18, 36, 55, 67, 112-114)
    const popularSurahs = [1, 2, 18, 36, 55, 67, 112, 113, 114];

    console.log(`Fetching tafsir for popular surahs: ${popularSurahs.join(', ')}\n`);

    const tafsirData = {
        metadata: {
            name: 'Tafsir Ibn Kathir',
            author: 'Hafiz Ibn Kathir',
            language: 'English',
            description: 'Abridged English translation of Tafsir Ibn Kathir',
            source: 'spa5k/tafsir_api',
            slug: 'en-tafisr-ibn-kathir',
            note: 'Contains tafsir for popular surahs. More can be added on demand.'
        },
        tafsirs: []
    };

    let successCount = 0;
    let errorCount = 0;

    for (const chapter of popularSurahs) {
        const url = `${BASE_URL}/${chapter}.json`;
        console.log(`Fetching Surah ${chapter}...`);

        try {
            const response = await downloadJSON(url);

            if (response && response.ayahs && Array.isArray(response.ayahs)) {
                // The response contains all verses for the surah
                const ayahs = response.ayahs;

                for (const ayah of ayahs) {
                    if (ayah.text && ayah.text.trim()) {
                        tafsirData.tafsirs.push({
                            chapter: ayah.surah,
                            verse: ayah.ayah,
                            text: ayah.text
                        });
                        successCount++;
                    }
                }

                console.log(`✓ Completed Surah ${chapter} (${ayahs.length} verses)`);
            } else {
                console.log(`⚠ No tafsir found for Surah ${chapter}`);
                errorCount++;
            }

            // Delay to avoid rate limiting
            await delay(DELAY_MS);

        } catch (error) {
            console.error(`✗ Failed to fetch Surah ${chapter}:`, error.message);
            errorCount++;
        }
    }

    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tafsirData, null, 2));

    console.log(`\n✅ Download complete!`);
    console.log(`Success: ${successCount} verses`);
    console.log(`Errors: ${errorCount} surahs`);
    console.log(`\nFile saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);

