# Dhivehi Quran Audio Integration Guide

## Overview
This guide explains how to add Dhivehi Quran recitation audio to the LifeOS Islamic module.

## Current Status
✅ **Dhivehi Translation**: Complete (6,236 verses across 114 surahs)  
⚠️ **Dhivehi Audio**: Not yet integrated (awaiting audio source)

## Available Dhivehi Reciters

### 1. Dr. Mohamed Shaheem Ali Saeed
- **Status**: Complete Quran recitation available
- **Quality**: Professional recitation
- **Sources**:
  - QuranCentral.com: https://qurancentral.com/audio/mohamed-shaheem-ali-saeed/
  - Podcast platforms (Podbean, etc.)
  - Facebook page: "Quran Recitation by Dr.Shaheem"

### 2. PSM (Public Service Media - Maldives)
- **Status**: Partial (29 surahs only)
- **Source**: SoundCloud
- **Note**: Incomplete, not suitable for full integration

## Integration Steps

### Step 1: Obtain Audio Files

**Option A: Contact QuranCentral.com**
1. Visit: https://qurancentral.com/audio/mohamed-shaheem-ali-saeed/
2. Contact them to request:
   - Permission to use audio files
   - Direct download links or API access
   - Audio file format (MP3 preferred)
   - File naming convention

**Option B: Extract from Podcast**
1. Find the podcast RSS feed
2. Extract MP3 URLs for all 114 surahs
3. Verify audio quality and completeness

**Option C: Contact Dr. Shaheem's Team**
1. Reach out via Facebook page or Islamic University of Maldives
2. Request permission and audio files
3. Discuss hosting options

### Step 2: Host Audio Files

**Option A: Self-Hosting**
```
/public/audio/quran/dhivehi/shaheem/
  ├── 001.mp3  (Al-Fatihah)
  ├── 002.mp3  (Al-Baqarah)
  ├── ...
  └── 114.mp3  (An-Nas)
```

**Option B: CDN Hosting**
- Upload to a CDN (Cloudflare, AWS S3, etc.)
- Get public URLs for each surah

**Option C: External API**
- Use existing API if available
- Similar to everyayah.com structure

### Step 3: Update Code

#### 3.1 Add Dhivehi Reciter to EnhancedQuranExplorer.tsx

```typescript
// Find the RECITERS array (around line 50)
const RECITERS = [
    // ... existing Arabic reciters ...
    
    // Add Dhivehi reciter
    {
        id: 'shaheem',
        name: 'Dr. Mohamed Shaheem Ali Saeed',
        language: 'Dhivehi',
        arabicName: 'ޑރ. މުޙައްމަދު ޝަހީމް ޢަލީ ސަޢީދު',
        baseUrl: 'YOUR_AUDIO_BASE_URL_HERE/{surah:03d}.mp3'
        // Example: 'https://yourcdn.com/quran/dhivehi/shaheem/{surah:03d}.mp3'
    }
];
```

#### 3.2 Add Language Filter

```typescript
// Add state for language filter
const [audioLanguage, setAudioLanguage] = useState<'arabic' | 'dhivehi'>('arabic');

// Add language selector in the UI (before reciter selector)
<div className="flex gap-2 mb-4">
    <button
        onClick={() => setAudioLanguage('arabic')}
        className={`flex-1 px-4 py-2 rounded-xl ${
            audioLanguage === 'arabic'
                ? 'bg-accent text-white'
                : 'bg-tertiary text-text-secondary'
        }`}
    >
        Arabic Recitation
    </button>
    <button
        onClick={() => setAudioLanguage('dhivehi')}
        className={`flex-1 px-4 py-2 rounded-xl ${
            audioLanguage === 'dhivehi'
                ? 'bg-accent text-white'
                : 'bg-tertiary text-text-secondary'
        }`}
    >
        Dhivehi Recitation
    </button>
</div>

// Filter reciters by language
const filteredReciters = RECITERS.filter(r => 
    audioLanguage === 'dhivehi' 
        ? r.language === 'Dhivehi' 
        : r.language !== 'Dhivehi'
);
```

### Step 4: Test Audio Playback

1. Open Islamic module → Quran Explorer
2. Select any surah
3. Switch to "Dhivehi Recitation"
4. Select "Dr. Mohamed Shaheem Ali Saeed"
5. Click play button
6. Verify audio plays correctly
7. Test multiple surahs to ensure all files are accessible

## Audio File Requirements

- **Format**: MP3 (recommended) or M4A
- **Bitrate**: 64-128 kbps (good quality, reasonable file size)
- **Naming**: 001.mp3 to 114.mp3 (zero-padded 3 digits)
- **Total Size**: Approximately 500MB - 1GB for complete Quran

## Alternative: Temporary Solution

If audio files are not immediately available, you can:

1. **Add a notice in the UI**:
```typescript
{audioLanguage === 'dhivehi' && (
    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
            <span className="font-semibold">Dhivehi Audio Coming Soon!</span>
            <br />
            We're working on integrating Dr. Mohamed Shaheem Ali Saeed's complete Quran recitation.
            In the meantime, you can listen to Arabic recitation while reading the Dhivehi translation.
        </p>
    </div>
)}
```

2. **Provide external links**:
```typescript
<a 
    href="https://qurancentral.com/audio/mohamed-shaheem-ali-saeed/"
    target="_blank"
    rel="noopener noreferrer"
    className="text-accent hover:underline"
>
    Listen on QuranCentral.com →
</a>
```

## Contact Information

**QuranCentral.com**
- Website: https://qurancentral.com/
- Contact page: Look for contact form or email

**Dr. Mohamed Shaheem Ali Saeed**
- Facebook: "Quran Recitation by Dr.Shaheem"
- Institution: Islamic University of Maldives

**Alternative Sources**
- Maldivian Islamic Ministry
- Local Maldivian Islamic organizations
- Dhivehi Quran apps on Play Store/App Store

## Notes

- Always obtain proper permission before using audio files
- Credit the reciter appropriately in the UI
- Consider bandwidth and storage costs for hosting
- Test audio playback on different devices and browsers
- Ensure audio files are properly licensed for distribution

## Future Enhancements

- Add multiple Dhivehi reciters
- Add download option for offline listening
- Add playback speed control
- Add repeat/loop functionality
- Add verse-by-verse highlighting during playback

