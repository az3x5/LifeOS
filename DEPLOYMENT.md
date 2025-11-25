# LifeOS Deployment Guide

This guide will walk you through deploying LifeOS to GitHub and Vercel.

## 📋 Prerequisites

Before you begin, make sure you have:

- [x] A GitHub account
- [x] A Vercel account (sign up at [vercel.com](https://vercel.com))
- [x] A Supabase project with tables and RLS policies set up
- [x] Git installed on your computer
- [x] Your Supabase credentials ready

## 🚀 Step 1: Push to GitHub

### 1.1 Initialize Git Repository (if not already done)

```bash
git init
```

### 1.2 Add All Files

```bash
git add .
```

### 1.3 Commit Your Changes

```bash
git commit -m "Initial commit: LifeOS application"
```

### 1.4 Create a New Repository on GitHub

1. Go to [GitHub](https://github.com)
2. Click the "+" icon in the top right
3. Select "New repository"
4. Name it "LifeOS" (or your preferred name)
5. **Do NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### 1.5 Link Your Local Repository to GitHub

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/LifeOS.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## 🌐 Step 2: Deploy to Vercel

### 2.1 Import Project to Vercel

1. Go to [Vercel](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your GitHub repository (you may need to authorize Vercel to access your GitHub)
4. Select the "LifeOS" repository

### 2.2 Configure Project Settings

Vercel should auto-detect that this is a Vite project. Verify these settings:

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### 2.3 Add Environment Variables

Click "Environment Variables" and add:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g., `https://xxxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

**Where to find these:**
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy "Project URL" and "anon public" key

### 2.4 Deploy

1. Click "Deploy"
2. Wait for the build to complete (usually 1-2 minutes)
3. Once deployed, you'll get a URL like `https://your-app.vercel.app`

## 🔧 Step 3: Update Supabase Settings

After deployment, you need to update your Supabase project to allow authentication from your Vercel domain.

### 3.1 Update Site URL

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Authentication → URL Configuration
4. Update **Site URL** to your Vercel URL: `https://your-app.vercel.app`

### 3.2 Add Redirect URLs

In the same section, add these to **Redirect URLs**:
- `https://your-app.vercel.app/**`
- `http://localhost:3001/**` (for local development)

### 3.3 Save Changes

Click "Save" at the bottom of the page.

## ✅ Step 4: Test Your Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Try to sign up with a new account
3. Verify that you can log in
4. Test creating some data (habits, notes, etc.)
5. Log out and log back in to verify data persistence

## 🔄 Step 5: Set Up Continuous Deployment

Good news! Continuous deployment is already set up. Every time you push to the `main` branch on GitHub, Vercel will automatically:

1. Pull the latest code
2. Run the build
3. Deploy the new version

To deploy updates:

```bash
git add .
git commit -m "Your commit message"
git push
```

## 🎨 Step 6: Custom Domain (Optional)

### 6.1 Add Custom Domain in Vercel

1. Go to your project in Vercel
2. Click "Settings" → "Domains"
3. Add your custom domain (e.g., `lifeos.yourdomain.com`)
4. Follow Vercel's instructions to update your DNS settings

### 6.2 Update Supabase URLs

After adding a custom domain, update your Supabase:
1. Go to Authentication → URL Configuration
2. Update Site URL to your custom domain
3. Add your custom domain to Redirect URLs

## 🐛 Troubleshooting

### Build Fails on Vercel

**Problem:** Build fails with TypeScript errors

**Solution:**
- Check the build logs in Vercel
- Run `npm run build` locally to see the errors
- Fix any TypeScript errors and push again

### Authentication Not Working

**Problem:** Can't log in or sign up

**Solution:**
- Verify environment variables are set correctly in Vercel
- Check that Site URL and Redirect URLs are correct in Supabase
- Check browser console for errors

### Data Not Syncing

**Problem:** Data doesn't sync between devices

**Solution:**
- Verify you're logged in with the same account
- Check browser console for sync errors
- Verify Supabase RLS policies are set up correctly
- Check that the user has internet connection

### "Supabase credentials are missing" Error

**Problem:** App shows error about missing credentials

**Solution:**
- Verify environment variables are set in Vercel
- Make sure variable names are exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Redeploy after adding environment variables

## 📊 Monitoring Your Deployment

### Vercel Analytics

Vercel provides built-in analytics:
1. Go to your project in Vercel
2. Click "Analytics" tab
3. View page views, performance metrics, etc.

### Supabase Monitoring

Monitor your database usage:
1. Go to your Supabase Dashboard
2. Check "Database" → "Usage" for storage and bandwidth
3. Check "Authentication" → "Users" for user count

## 🔐 Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use environment variables** - Always use Vercel's environment variables for secrets
3. **Keep dependencies updated** - Run `npm update` regularly
4. **Monitor Supabase logs** - Check for suspicious activity
5. **Enable 2FA** - Enable two-factor authentication on GitHub, Vercel, and Supabase

## 📈 Scaling Considerations

### Free Tier Limits

**Vercel Free Tier:**
- 100 GB bandwidth per month
- Unlimited deployments
- Automatic HTTPS

**Supabase Free Tier:**
- 500 MB database space
- 2 GB bandwidth per month
- 50,000 monthly active users

### When to Upgrade

Consider upgrading when:
- You exceed free tier limits
- You need custom domains (Vercel Pro)
- You need more database storage (Supabase Pro)
- You need priority support

## 🎉 Success!

Your LifeOS application is now live and accessible to anyone with the URL!

**Next Steps:**
- Share your app URL with friends and family
- Set up a custom domain
- Monitor usage and performance
- Keep your dependencies updated
- Add new features and improvements

## 📞 Need Help?

- **Vercel Documentation:** https://vercel.com/docs
- **Supabase Documentation:** https://supabase.com/docs
- **GitHub Issues:** Open an issue in your repository

---

Happy deploying! 🚀

