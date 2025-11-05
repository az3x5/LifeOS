# 🚀 LifeOS Deployment Checklist

Use this checklist to ensure a smooth deployment to GitHub and Vercel.

## ✅ Pre-Deployment Checklist

### Local Setup
- [ ] All features working locally
- [ ] No console errors in browser
- [ ] Production build successful (`npm run build`)
- [ ] Environment variables configured in `.env`
- [ ] `.env` file is in `.gitignore` (should already be there)

### Supabase Setup
- [ ] Supabase project created
- [ ] Database tables created (run `supabase-setup.sql`)
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] RLS policies created for all tables
- [ ] Authentication enabled (Email/Password)
- [ ] Supabase URL and Anon Key copied

### Code Preparation
- [ ] All changes committed locally
- [ ] No sensitive data in code (API keys, passwords, etc.)
- [ ] README.md updated with project information
- [ ] `.env.example` file created with template

## 📦 GitHub Deployment

### Step 1: Create GitHub Repository
- [ ] GitHub account ready
- [ ] New repository created on GitHub
- [ ] Repository name chosen (e.g., "LifeOS")
- [ ] Repository is public or private (your choice)

### Step 2: Push Code to GitHub
```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit: LifeOS application"

# Set main branch
git branch -M main

# Add remote origin (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/LifeOS.git

# Push to GitHub
git push -u origin main
```

- [ ] Git repository initialized
- [ ] All files added and committed
- [ ] Remote origin added
- [ ] Code pushed to GitHub
- [ ] Verify code is visible on GitHub

## 🌐 Vercel Deployment

### Step 1: Import Project
- [ ] Vercel account created/logged in
- [ ] GitHub connected to Vercel
- [ ] Project imported from GitHub
- [ ] Repository selected

### Step 2: Configure Build Settings
Verify these settings (should be auto-detected):
- [ ] Framework: Vite
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Install Command: `npm install`

### Step 3: Add Environment Variables
Add these in Vercel project settings:
- [ ] `VITE_SUPABASE_URL` = Your Supabase project URL
- [ ] `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key

### Step 4: Deploy
- [ ] Click "Deploy" button
- [ ] Wait for build to complete
- [ ] Deployment successful
- [ ] Deployment URL received (e.g., `https://your-app.vercel.app`)

## 🔧 Post-Deployment Configuration

### Supabase Configuration
- [ ] Go to Supabase Dashboard
- [ ] Navigate to Authentication → URL Configuration
- [ ] Update Site URL to Vercel URL
- [ ] Add Vercel URL to Redirect URLs
- [ ] Add `http://localhost:3001/**` to Redirect URLs (for local dev)
- [ ] Save changes

### Testing
- [ ] Visit deployed URL
- [ ] Sign up with test account
- [ ] Verify email (if email confirmation enabled)
- [ ] Log in successfully
- [ ] Create test data (habit, note, transaction, etc.)
- [ ] Log out
- [ ] Log back in
- [ ] Verify data persists
- [ ] Test on mobile device
- [ ] Test on different browsers

## 🎨 Optional Enhancements

### Custom Domain (Optional)
- [ ] Domain purchased
- [ ] Domain added in Vercel settings
- [ ] DNS records updated
- [ ] SSL certificate active
- [ ] Custom domain working
- [ ] Supabase URLs updated with custom domain

### Google OAuth (Optional)
- [ ] Google Cloud Console project created
- [ ] OAuth credentials created
- [ ] Authorized redirect URIs added
- [ ] Credentials added to Supabase
- [ ] Google sign-in tested

### Analytics (Optional)
- [ ] Vercel Analytics enabled
- [ ] Google Analytics added (if desired)
- [ ] Error tracking set up (e.g., Sentry)

## 📊 Monitoring

### Initial Monitoring
- [ ] Check Vercel deployment logs
- [ ] Check Supabase logs
- [ ] Monitor for errors in first 24 hours
- [ ] Check performance metrics

### Ongoing Monitoring
- [ ] Set up alerts for downtime
- [ ] Monitor database usage
- [ ] Monitor bandwidth usage
- [ ] Check for security issues

## 🔒 Security Review

- [ ] No API keys in code
- [ ] Environment variables properly set
- [ ] RLS policies working correctly
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Authentication working properly
- [ ] Test that users can't access other users' data

## 📝 Documentation

- [ ] README.md complete
- [ ] DEPLOYMENT.md available
- [ ] Environment variables documented
- [ ] Setup instructions clear
- [ ] Troubleshooting section added

## 🎉 Launch!

- [ ] All checklist items completed
- [ ] Application tested thoroughly
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Ready to share with users!

## 📞 Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Vite Docs:** https://vitejs.dev/guide/
- **React Docs:** https://react.dev/

## 🚨 Troubleshooting

If something goes wrong:

1. **Check Vercel build logs** - Look for errors during build
2. **Check browser console** - Look for runtime errors
3. **Verify environment variables** - Make sure they're set correctly
4. **Check Supabase logs** - Look for database/auth errors
5. **Test locally** - Make sure it works locally first
6. **Redeploy** - Sometimes a fresh deployment fixes issues

---

## 📋 Quick Command Reference

```bash
# Local development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Git commands
git add .
git commit -m "Your message"
git push

# Check git status
git status

# View git log
git log --oneline
```

---

**Congratulations on deploying LifeOS! 🎊**

Your personal life operating system is now live and accessible from anywhere!

