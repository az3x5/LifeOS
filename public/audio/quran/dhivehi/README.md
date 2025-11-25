# Dhivehi Quran Audio Files

## 📁 Directory Purpose
This directory contains Dhivehi Quran recitation audio files (MP3 format) by **Dr. Mohamed Shaheem Ali Saeed**.

## 📦 Files Required
- **114 MP3 files** (one for each Surah)
- **Total Size**: ~3.47 GB
- **Naming Format**: `001AL-FATIHA.mp3`, `002AL-BAQARAH.mp3`, etc.

## ⚠️ Important Note
These audio files are **NOT included in the Git repository** due to their large size (3.47 GB total).

## 📥 How to Add Audio Files

### Option 1: Download from Source
1. Obtain the Dhivehi Quran audio files from your source
2. Place all 114 MP3 files in this directory
3. Ensure files are named correctly: `001AL-FATIHA.mp3` through `114AN-NAS.mp3`

### Option 2: Use External Hosting
If you prefer to host these files externally:
1. Upload files to a CDN or cloud storage (e.g., AWS S3, Cloudflare R2)
2. Update the audio URL in `components/islamic/EnhancedQuranExplorer.tsx`
3. Modify the `getAudioUrl()` function to point to your CDN

## 🔧 File Naming Convention
```
[Surah Number (3 digits)][Surah Name in English].mp3

Examples:
- 001AL-FATIHA.mp3
- 002AL-BAQARAH.mp3
- 114AN-NAS.mp3
```

## 📊 File Size Reference
Largest files:
- 002AL-BAQARAH.mp3: ~261 MB
- 004AN-NISA.mp3: ~156 MB
- 003AL-IMRAN.mp3: ~151 MB
- 007AL-ARAF.mp3: ~149 MB

## 🚀 For Deployment
When deploying to production:
1. **Option A**: Upload audio files to your hosting provider separately
2. **Option B**: Use a CDN service for better performance
3. **Option C**: Implement on-demand loading from external storage

## 📝 Credits
**Reciter**: Dr. Mohamed Shaheem Ali Saeed  
**Language**: Dhivehi (Maldivian)  
**Format**: MP3  
**Quality**: High-quality audio recordings

