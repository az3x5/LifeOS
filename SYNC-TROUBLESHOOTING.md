# 🔧 Sync Troubleshooting Guide

## Connection Success but Not Syncing?

If you see "Connection Success" but data isn't syncing between devices, follow these steps:

---

## 🔍 Step 1: Use the Debug Tool

Visit: **https://life-os-mu-ruddy.vercel.app/debug-sync.html**

This tool will show you:
- ✅ Authentication status
- ✅ Local database record counts
- ✅ Remote database record counts
- ✅ Sync logs in real-time

---

## 📋 Common Issues & Solutions

### Issue 1: Not Logged In

**Symptom:** Debug tool shows "Not Authenticated"

**Solution:**
1. Go to the main app: https://life-os-mu-ruddy.vercel.app/
2. Sign up or log in
3. Return to debug tool
4. Click "🔄 Refresh Auth"

---

### Issue 2: Using Different Accounts

**Symptom:** Data on phone doesn't appear on web (or vice versa)

**Solution:**
1. Make sure you're logged in with the **same email** on both devices
2. Check User ID in debug tool - should be identical on both devices
3. If different, log out and log in with the same account

---

### Issue 3: Data Only in Local Database

**Symptom:** 
- Debug tool shows records in "Local Database"
- Debug tool shows 0 records in "Remote Database"

**Solution:**
1. Click "⬆️ Push to Cloud" button in debug tool
2. Wait for "Push completed successfully" message
3. Click "🔄 Refresh Remote Data"
4. Verify records now appear in Remote Database

---

### Issue 4: Data Only in Remote Database

**Symptom:**
- Debug tool shows 0 records in "Local Database"
- Debug tool shows records in "Remote Database"

**Solution:**
1. Click "⬇️ Pull from Cloud" button in debug tool
2. Wait for "Pull completed successfully" message
3. Click "🔄 Refresh Local Data"
4. Verify records now appear in Local Database

---

### Issue 5: Sync Not Happening Automatically

**Symptom:** Manual sync works, but automatic sync doesn't

**Possible Causes:**
1. **Not logged in** - Sync only works when authenticated
2. **Offline** - Check internet connection
3. **Browser blocking** - Check browser console for errors (F12)

**Solution:**
1. Make sure you're logged in on both devices
2. Check internet connection
3. Open browser console (F12) and look for errors
4. Try manual sync in Settings or debug tool

---

## 🧪 Testing Sync Between Devices

### Test 1: Phone → Web

1. **On Phone:**
   - Open app
   - Make sure you're logged in
   - Add a new habit (e.g., "Test Habit")
   - Wait 5 seconds (auto-sync delay)
   - OR go to Settings → Click "Sync Now"

2. **On Web:**
   - Open https://life-os-mu-ruddy.vercel.app/debug-sync.html
   - Click "🔄 Refresh Remote Data"
   - Check if "habits" count increased
   - Go to main app
   - Check if "Test Habit" appears

### Test 2: Web → Phone

1. **On Web:**
   - Open app
   - Make sure you're logged in
   - Add a new transaction (e.g., $10 Coffee)
   - Wait 5 seconds (auto-sync delay)
   - OR go to Settings → Click "Sync Now"

2. **On Phone:**
   - Open debug tool: https://life-os-mu-ruddy.vercel.app/debug-sync.html
   - Click "🔄 Refresh Remote Data"
   - Check if "transactions" count increased
   - Go to main app
   - Refresh or reopen app
   - Check if "$10 Coffee" appears

---

## 🔍 Check Browser Console

### On Web:
1. Press **F12** (or Ctrl+Shift+I)
2. Click **Console** tab
3. Look for sync messages:
   ```
   === Starting two-way sync ===
   User ID: abc123...
   Step 1: Pulling remote changes...
   Pull result: SUCCESS
   Step 2: Pushing local changes...
   5 habits synced to Supabase.
   Push result: SUCCESS
   === Two-way sync completed successfully ===
   ```

### On Phone:
1. Open Chrome/Safari
2. Visit: https://life-os-mu-ruddy.vercel.app/debug-sync.html
3. Check the "Sync Logs" section
4. Click "🔄 Manual Sync (Two-Way)"
5. Watch the logs for errors

---

## 🚨 Error Messages & Solutions

### Error: "No authenticated user for sync"

**Cause:** Not logged in

**Solution:**
1. Go to main app
2. Log in
3. Try sync again

---

### Error: "Failed to sync habits: 401"

**Cause:** Authentication token expired

**Solution:**
1. Log out
2. Log in again
3. Try sync again

---

### Error: "Failed to sync habits: 403"

**Cause:** Row Level Security (RLS) policy blocking access

**Solution:**
1. Make sure you're logged in
2. Check that user_id matches your account
3. Contact support if issue persists

---

### Error: "Network request failed"

**Cause:** No internet connection or Supabase is down

**Solution:**
1. Check internet connection
2. Try again in a few minutes
3. Check Supabase status: https://status.supabase.com/

---

## 📊 Expected Behavior

### Automatic Sync:
- **On Sign In:** Syncs immediately (two-way)
- **After Data Change:** Syncs after 5 seconds
- **Periodic:** Syncs every 5 minutes
- **On Settings → Sync Now:** Syncs immediately

### Sync Process:
1. **Pull:** Downloads data from Supabase
2. **Merge:** Compares timestamps, keeps newer data
3. **Push:** Uploads local data to Supabase

### Conflict Resolution:
- Compares `updated_at` timestamps
- Newer data always wins
- If no timestamp, remote data wins (safer)

---

## 🔧 Manual Sync Options

### Option 1: Settings Page
1. Go to main app
2. Click Settings (⚙️)
3. Scroll to "Data Sync"
4. Click "Sync Now" button

### Option 2: Debug Tool
1. Visit: https://life-os-mu-ruddy.vercel.app/debug-sync.html
2. Click "🔄 Manual Sync (Two-Way)"
3. Watch logs for success/errors

### Option 3: Browser Console
1. Press F12
2. Type: `syncAllData()`
3. Press Enter
4. Watch console for logs

---

## 📱 Device-Specific Issues

### iOS Safari:
- Make sure "Prevent Cross-Site Tracking" is OFF
- Settings → Safari → Privacy → Prevent Cross-Site Tracking (disable)

### Android Chrome:
- Make sure cookies are enabled
- Settings → Site Settings → Cookies (allow)

### Desktop Browsers:
- Clear cache if sync was working before
- Try incognito/private mode
- Check browser extensions aren't blocking requests

---

## ✅ Verification Checklist

- [ ] Logged in with same account on both devices
- [ ] Internet connection working
- [ ] Browser console shows no errors
- [ ] Debug tool shows authentication success
- [ ] Debug tool shows local data exists
- [ ] Debug tool shows remote data exists
- [ ] Manual sync works in debug tool
- [ ] Data appears after manual sync
- [ ] Automatic sync works after 5 seconds

---

## 🆘 Still Not Working?

If sync still doesn't work after trying all the above:

1. **Export your data:**
   - Settings → Export Data
   - Save backup file

2. **Clear local database:**
   - Browser console: `indexedDB.deleteDatabase('LifeOSDB')`
   - Refresh page

3. **Log in again:**
   - Sign in with your account
   - Data should sync from cloud

4. **Check debug tool:**
   - Visit debug tool
   - Verify data synced correctly

5. **Import backup if needed:**
   - Settings → Import Data
   - Select backup file

---

## 📞 Debug Information to Collect

If you need support, collect this information:

1. **User ID:** From debug tool
2. **Browser:** Chrome/Safari/Firefox + version
3. **Device:** Phone/Desktop + OS
4. **Error messages:** From browser console
5. **Sync logs:** From debug tool
6. **Record counts:** Local vs Remote from debug tool

---

## 🔗 Useful Links

- **Main App:** https://life-os-mu-ruddy.vercel.app/
- **Test Page:** https://life-os-mu-ruddy.vercel.app/test-env.html
- **Debug Tool:** https://life-os-mu-ruddy.vercel.app/debug-sync.html
- **Supabase Status:** https://status.supabase.com/

---

**💡 Tip:** The debug tool is your best friend for diagnosing sync issues!

