# Vercel Environment Variables Setup

## 🚨 Issue: Database Not Working on Vercel

Your app works on localhost but not on Vercel because **environment variables are missing** on Vercel.

The `.env` file only works locally. Vercel needs environment variables configured in its dashboard.

---

## ✅ Solution: Add Environment Variables to Vercel

### Step 1: Go to Vercel Dashboard

1. Open: https://vercel.com/dashboard
2. Click on your project: **life-os-mu-ruddy**
3. Go to **Settings** tab
4. Click **Environment Variables** in the left sidebar

### Step 2: Add These Environment Variables

Add the following two environment variables:

#### Variable 1: VITE_SUPABASE_URL
```
Name: VITE_SUPABASE_URL
Value: https://lobqjdkqrlqhohbcjlzg.supabase.co
Environment: Production, Preview, Development (select all)
```

#### Variable 2: VITE_SUPABASE_ANON_KEY
```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvYnFqZGtxcmxxaG9oYmNqbHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTAxNTUsImV4cCI6MjA3NzY4NjE1NX0.TD2oOta9oKSBqpLtvabFbRgzYWI0pRPrM9j1IKR95d4
Environment: Production, Preview, Development (select all)
```

### Step 3: Redeploy

After adding the environment variables:

1. Go to **Deployments** tab
2. Click the **three dots (...)** on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

---

## 📸 Visual Guide

### Adding Environment Variables:

```
Vercel Dashboard
├── Your Project (life-os-mu-ruddy)
│   ├── Settings
│   │   ├── Environment Variables
│   │   │   ├── [Add New] button
│   │   │   │   ├── Name: VITE_SUPABASE_URL
│   │   │   │   ├── Value: https://lobqjdkqrlqhohbcjlzg.supabase.co
│   │   │   │   └── Environments: ✓ Production ✓ Preview ✓ Development
│   │   │   │
│   │   │   └── [Add New] button
│   │   │       ├── Name: VITE_SUPABASE_ANON_KEY
│   │   │       ├── Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
│   │   │       └── Environments: ✓ Production ✓ Preview ✓ Development
```

---

## 🔍 How to Verify It's Working

### Before Fix:
```javascript
// Browser Console on https://life-os-mu-ruddy.vercel.app/
> console.log(import.meta.env.VITE_SUPABASE_URL)
undefined ❌

// Error in console:
"Supabase credentials are missing. Please check your environment variables"
```

### After Fix:
```javascript
// Browser Console on https://life-os-mu-ruddy.vercel.app/
> console.log(import.meta.env.VITE_SUPABASE_URL)
"https://lobqjdkqrlqhohbcjlzg.supabase.co" ✅

// Sync logs in console:
"=== Starting two-way sync ==="
"User ID: abc123..."
"Two-way sync completed successfully"
```

---

## 🎯 Quick Checklist

- [ ] Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- [ ] Add `VITE_SUPABASE_URL` with value from `.env` file
- [ ] Add `VITE_SUPABASE_ANON_KEY` with value from `.env` file
- [ ] Select all environments (Production, Preview, Development)
- [ ] Click "Save"
- [ ] Go to Deployments → Redeploy latest deployment
- [ ] Wait for deployment to complete
- [ ] Open https://life-os-mu-ruddy.vercel.app/
- [ ] Open browser console (F12)
- [ ] Check for sync logs
- [ ] Try logging in and syncing data

---

## 🚀 Alternative: Use Vercel CLI

If you prefer using the command line:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Add environment variables
vercel env add VITE_SUPABASE_URL production
# Paste: https://lobqjdkqrlqhohbcjlzg.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Redeploy
vercel --prod
```

---

## 📝 Why This Happens

1. **Local Development**: Uses `.env` file → Works ✅
2. **Vercel Deployment**: `.env` file is NOT uploaded (for security) → Fails ❌
3. **Solution**: Add environment variables in Vercel Dashboard → Works ✅

---

## 🔒 Security Note

The `VITE_SUPABASE_ANON_KEY` is safe to expose in the browser because:
- It's the "anonymous" key (public key)
- Supabase has Row Level Security (RLS) policies
- Users can only access their own data
- The service key (private key) is never exposed

---

## ✅ After Setup

Once environment variables are added and redeployed:

1. **Authentication will work** on Vercel
2. **Database sync will work** between devices
3. **All features will work** just like localhost
4. **Data will persist** in Supabase cloud

---

## 🆘 Still Not Working?

If it still doesn't work after adding environment variables:

1. **Check browser console** for errors
2. **Verify environment variables** are saved in Vercel
3. **Clear browser cache** and hard refresh (Ctrl+Shift+R)
4. **Check Supabase dashboard** to verify project is active
5. **Test authentication** by trying to sign up/login

---

## 📞 Need Help?

If you encounter any issues:
1. Check browser console for error messages
2. Check Vercel deployment logs
3. Verify Supabase project is active
4. Make sure RLS policies are set up correctly

