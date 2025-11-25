# Islamic Data Files

## 📁 Directory Purpose
This directory contains Islamic data files for the LifeOS Islamic Knowledge module.

## 📦 Required Files

### 1. Prayer Times Data (NOT in Git)
**File**: `prayer_times.json`  
**Size**: ~40 MB  
**Format**: NDJSON (Newline-Delimited JSON)  
**Content**: Prayer times for all 195 Maldivian islands for the entire year  
**Records**: ~71,005 entries

**Structure**:
```json
{"island_reg":"K01","date":"2024-01-01","fajr":"05:45","sunrise":"06:58","dhuhr":"12:25","asr":"15:42","maghrib":"18:15","isha":"19:28"}
```

### 2. Islands Data (NOT in Git)
**File**: `islands.json`  
**Size**: ~50 KB  
**Format**: JSON Array  
**Content**: List of 195 Maldivian islands with coordinates  

**Structure**:
```json
[
  {
    "reg_no": "K01",
    "name_en": "Male'",
    "name_dv": "މާލެ",
    "atoll_code": "K",
    "latitude": 4.1755,
    "longitude": 73.5093
  }
]
```

### 3. Atolls Data (NOT in Git)
**File**: `atolls.json`  
**Size**: ~5 KB  
**Format**: JSON Array  
**Content**: List of 21 Maldivian atolls  

**Structure**:
```json
[
  {
    "code": "K",
    "name_en": "Male' Atoll",
    "name_dv": "މާލެ އަތޮޅު"
  }
]
```

## ⚠️ Important Note
The prayer times, islands, and atolls JSON files are **NOT included in the Git repository** due to their size (~40 MB total).

## 📥 How to Add Data Files

### For Development
1. Place the three JSON files in this directory:
   - `prayer_times.json`
   - `islands.json`
   - `atolls.json`
2. The application will automatically load them

### For Production
**Option 1: Include in Build**
- Add files to this directory before building
- They will be bundled with the application

**Option 2: External API**
- Host the data on a separate API server
- Update `services/islamicDataService.ts` to fetch from API
- Implement caching for better performance

**Option 3: Database Storage**
- Import data into Supabase database
- Create tables: `prayer_times`, `islands`, `atolls`
- Update service to query database instead of JSON files

## 🔧 Sample Data
A sample file `prayer-times-sample.json` is included in the repository showing the data structure.

## 📊 Data Sources
- **Prayer Times**: Maldives Islamic Ministry
- **Islands & Atolls**: Official Maldivian geographic data

## 🚀 Recommended for Production
For production deployments, we recommend:
1. **Store in Supabase**: Import data into database tables
2. **Enable Caching**: Cache frequently accessed data
3. **Optimize Queries**: Index by island_reg and date for fast lookups

## 📝 Data Update Frequency
- **Prayer Times**: Update annually (times change slightly each year)
- **Islands**: Update when new islands are registered
- **Atolls**: Rarely changes (stable geographic data)

