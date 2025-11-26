# Large Files Directory

This directory contains large files that are excluded from git tracking to keep the repository size manageable.

## Contents

### 1. Quran Audio Files (`audio/quran/dhivehi/`)
- **Size**: ~3.47 GB
- **Files**: 114 MP3 files (one for each Surah)
- **Reciter**: Dr. Mohamed Shaheem Ali Saeed
- **Format**: MP3, Dhivehi language

**Setup Instructions**:
1. Download the audio files from your source
2. Place them in `large-files/audio/quran/dhivehi/`
3. Run the copy script to move them to the public folder:
   ```powershell
   # PowerShell
   Copy-Item "large-files/audio/quran/dhivehi/*.mp3" -Destination "public/audio/quran/dhivehi/" -Force
   ```

### 2. Islamic Data Files (`data/islamic/`)
- **prayer_times.json**: ~71,005 prayer time entries for all Maldivian islands
- **islands.json**: 195 islands with coordinates and atoll codes
- **atolls.json**: 21 atolls with Dhivehi and English names

**Setup Instructions**:
1. Place the JSON files in `large-files/data/islamic/`
2. Run the copy script:
   ```powershell
   # PowerShell
   Copy-Item "large-files/data/islamic/*.json" -Destination "data/islamic/" -Force
   ```

## Deployment Options

### Option 1: Manual Upload (Recommended for Vercel/Netlify)
1. Keep large files in this directory locally
2. Upload them separately to your hosting provider's storage
3. Update file paths in the code to point to CDN/storage URLs

### Option 2: Git LFS (For GitHub)
```bash
git lfs install
git lfs track "large-files/**/*.mp3"
git lfs track "large-files/**/*.json"
git add .gitattributes
git add large-files/
git commit -m "Add large files with Git LFS"
```

### Option 3: Cloud Storage (Best for Production)
- Upload to AWS S3, Google Cloud Storage, or Azure Blob Storage
- Use CDN for faster delivery
- Update code to fetch from cloud URLs

## File Structure

```
large-files/
├── README.md (this file)
├── audio/
│   └── quran/
│       └── dhivehi/
│           ├── 001.mp3
│           ├── 002.mp3
│           └── ... (114 files total)
└── data/
    └── islamic/
        ├── prayer_times.json
        ├── islands.json
        └── atolls.json
```

## Notes

- These files are listed in `.gitignore` to prevent accidental commits
- Total size: ~3.5 GB
- Keep this directory in your local development environment
- For production, use cloud storage or CDN

