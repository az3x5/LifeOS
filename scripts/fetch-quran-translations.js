/**
 * Script to fetch Quran translations and tafsir
 * Run with: node scripts/fetch-quran-translations.js
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'islamic');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper function to download JSON from URL
function downloadJSON(url, outputPath) {
    return new Promise((resolve, reject) => {
        console.log(`Downloading: ${url}`);
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Follow redirect
                return downloadJSON(response.headers.location, outputPath).then(resolve).catch(reject);
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }

            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    fs.writeFileSync(outputPath, JSON.stringify(json, null, 2));
                    console.log(`✓ Saved: ${path.basename(outputPath)}`);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    console.log('📖 Fetching Quran Translations and Tafsir...\n');

    const downloads = [
        // English Translations
        {
            name: 'Clear Quran by Dr. Mustafa Khattab',
            url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/eng-mustafakhattaba.json',
            output: 'quran-translation-clear.json'
        },
        {
            name: 'Sahih International',
            url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/eng-ummmuhammad.json',
            output: 'quran-translation-sahih.json'
        },
        {
            name: 'Abdel Haleem',
            url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/eng-abdelhaleem.json',
            output: 'quran-translation-haleem.json'
        },
        // Tafsir Ibn Kathir (English)
        {
            name: 'Tafsir Ibn Kathir (English)',
            url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/tafsir-api@1/editions/eng-tafisr-ibn-kathir.json',
            output: 'tafsir-ibn-kathir-english.json'
        }
    ];

    for (const item of downloads) {
        try {
            const outputPath = path.join(OUTPUT_DIR, item.output);
            await downloadJSON(item.url, outputPath);
        } catch (error) {
            console.error(`✗ Failed to download ${item.name}:`, error.message);
        }
    }

    console.log('\n✅ Download complete!');
    console.log(`\nFiles saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);

