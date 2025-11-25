/**
 * Script to fetch HadithMV data from GitHub
 * Downloads hadith collections in JSON format from hadithmv.github.io
 */

import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base URL for HadithMV JSON files
const BASE_URL = 'https://raw.githubusercontent.com/hadithmv/hadithmv.github.io/master/js/json/';

// List of hadith books to download
const HADITH_BOOKS = [
  { id: 'muwattaMalik', name: 'Muwatta Malik', arabicName: 'موطأ مالك' },
  { id: 'arbaoonNawawi', name: "Nawawi's 40 Hadith", arabicName: 'الأربعون النووية' },
  { id: 'bulughulMaram', name: 'Bulughul Maram', arabicName: 'بلوغ المرام' },
  { id: 'umdathulAhkam', name: 'Umdatul Ahkam', arabicName: 'عمدة الأحكام' },
  { id: 'hisnulMuslim', name: 'Hisn al-Muslim', arabicName: 'حصن المسلم' },
  { id: 'kitabulIlmAbiKhaithama', name: "Abu Khaithama's Book of Knowledge", arabicName: 'كتاب العلم' },
];

// Create data directory if it doesn't exist
const DATA_DIR = path.join(__dirname, '..', 'data', 'islamic', 'hadithmv');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Download a file from URL
 */
function downloadFile(url, filename) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${filename}...`);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          // Parse JSON to validate
          const jsonData = JSON.parse(data);
          
          // Write to file
          const filepath = path.join(DATA_DIR, filename);
          fs.writeFileSync(filepath, JSON.stringify(jsonData, null, 2));
          
          console.log(`✓ Downloaded ${filename} (${jsonData.length} hadiths)`);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse ${filename}: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Network error downloading ${filename}: ${error.message}`));
    });
  });
}

/**
 * Create metadata file
 */
function createMetadata(books) {
  const metadata = {
    source: 'HadithMV - The Maldivian Platform for Translations of the Sunnah',
    sourceUrl: 'https://hadithmv.github.io',
    githubUrl: 'https://github.com/hadithmv/hadithmv.github.io',
    description: 'Hadith collections with Dhivehi translations',
    totalBooks: books.length,
    books: books.map(book => ({
      id: book.id,
      name: book.name,
      arabicName: book.arabicName,
      filename: `${book.id}.json`,
      totalHadiths: book.totalHadiths || 0
    })),
    lastUpdated: new Date().toISOString()
  };

  const metadataPath = path.join(DATA_DIR, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log('\n✓ Created metadata.json');
}

/**
 * Main function
 */
async function main() {
  console.log('=== HadithMV Data Fetcher ===\n');
  console.log(`Downloading ${HADITH_BOOKS.length} hadith collections...\n`);

  const results = [];

  for (const book of HADITH_BOOKS) {
    try {
      const url = `${BASE_URL}${book.id}.json`;
      const filename = `${book.id}.json`;
      const data = await downloadFile(url, filename);
      
      results.push({
        ...book,
        totalHadiths: data.length,
        success: true
      });
    } catch (error) {
      console.error(`✗ Error downloading ${book.name}: ${error.message}`);
      results.push({
        ...book,
        success: false,
        error: error.message
      });
    }
  }

  // Create metadata
  createMetadata(results.filter(r => r.success));

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total books: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log(`\nData saved to: ${DATA_DIR}`);
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

