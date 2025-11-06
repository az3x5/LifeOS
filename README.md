# LifeOS - Your Personal Life Operating System

A comprehensive personal dashboard application for managing your life with habits, health tracking, finance management, Islamic knowledge, notes, reminders, and more. Built with React, TypeScript, and Supabase.

> 🔧 **Environment Variables:** Configured for Vercel deployment

## ✨ Features

- 📊 **Dashboard** - Overview, Calendar, and Analytics in one place
- 💰 **Finance Tracker** - Manage accounts, transactions, and budgets
- ✅ **Habit Tracker** - Build and track daily habits with streaks
- ❤️ **Health Tracker** - Monitor health metrics and logs
- 🕌 **Islamic Knowledge** - Prayer times, Quran, Duas, and Islamic calendar
- 📝 **Notes** - Organize your thoughts and ideas
- 🔔 **Reminders** - Never miss important tasks with smart reminders
- ⚙️ **Settings** - Customize your experience
- 🔐 **Authentication** - Secure login with Supabase Auth
- ☁️ **Cloud Sync** - Automatic data synchronization across devices
- 📱 **Offline Support** - Works offline with IndexedDB
- 🚀 **Progressive Web App (PWA)** - Install on any device, works offline

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Supabase account (free tier works great!)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd LifeOS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   Get these values from your [Supabase project settings](https://app.supabase.com/project/_/settings/api).

4. **Set up Supabase database**

   Run the SQL commands in your Supabase SQL Editor to create tables and RLS policies. See [Database Setup](#database-setup) below.

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3001](http://localhost:3001) in your browser.

## 📦 Database Setup

You need to create the database tables and Row Level Security policies in your Supabase project. Here's a summary of what's needed:

### Tables to Create

Run these SQL commands in your Supabase SQL Editor:

1. **accounts** - Financial accounts
2. **categories** - Transaction categories
3. **transactions** - Financial transactions
4. **habits** - Habit definitions
5. **habit_logs** - Habit completion logs
6. **health_metrics** - Health metric definitions
7. **health_logs** - Health tracking logs
8. **notes** - Notes
9. **fasting_logs** - Fasting tracking
10. **islamic_events** - Islamic calendar events
11. **daily_reflections** - Daily reflections
12. **reminders** - Reminders

Each table includes:
- Primary key (`id`)
- Foreign key to `auth.users(id)` with CASCADE delete
- Row Level Security (RLS) policies ensuring users can only access their own data

**Note:** Contact the repository maintainer for the complete SQL setup script, or check the Supabase dashboard after initial deployment.

## 🌐 Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=<your-repo-url>)

### Manual Deployment

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel**

   - Go to [Vercel](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables:
     - `VITE_SUPABASE_URL` - Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
   - Click "Deploy"

3. **Update Supabase settings**

   After deployment, update your Supabase project settings:
   - Go to Authentication → URL Configuration
   - Add your Vercel URL to "Site URL" (e.g., `https://your-app.vercel.app`)
   - Add your Vercel URL to "Redirect URLs"

## 🔧 Configuration

### Progressive Web App (PWA)

LifeOS is a fully-featured PWA! Users can:
- 📱 **Install on any device** - Desktop, mobile, or tablet
- 📴 **Work offline** - Access data without internet
- ⚡ **Fast loading** - Cached resources load instantly

**Setup PWA Icons:**
1. Open `http://localhost:3000/generate-icons.html` in your browser
2. Click "Download All Icons" to generate PNG icons
3. Save all icons to the `public/` folder
4. Build and deploy

For detailed PWA setup instructions, see [PWA-SETUP.md](./PWA-SETUP.md)

### Supabase Authentication

The app supports:
- ✅ Email/Password authentication (enabled by default)
- ⚠️ Google OAuth (disabled, requires setup)

To enable Google OAuth:
1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com)
2. Add credentials to Supabase Auth settings
3. Uncomment the Google sign-in button in `modules/Auth.tsx`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Yes |

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS
- **Database:** Supabase (PostgreSQL)
- **Local Storage:** Dexie.js (IndexedDB)
- **Authentication:** Supabase Auth
- **Deployment:** Vercel
- **Charts:** D3.js

## 📱 Features in Detail

### Dashboard
- **Overview Tab:** Quick stats and recent activity
- **Calendar Tab:** Unified calendar showing habits, fasting, Islamic events, and reminders
- **Analytics Tab:** Comprehensive analytics from all modules

### Finance
- Track multiple accounts (bank, cash, credit cards)
- Categorize transactions
- View spending analytics
- Budget management

### Habits
- Create daily or custom frequency habits
- Track completion with streaks
- Set reminders for habits
- View performance analytics

### Health
- Define custom health metrics
- Log health data
- View trends and correlations
- Set health goals

### Islamic Knowledge
- Prayer times
- Quran verses
- Duas (supplications)
- Islamic calendar with events
- Fasting tracker

### Reminders
- Create one-time or recurring reminders
- Priority levels (low, medium, high)
- Categories (personal, work, health, finance)
- Browser notifications
- Integration with calendar

## 🔒 Security

- Row Level Security (RLS) ensures users can only access their own data
- JWT-based authentication
- Secure token refresh
- HTTPS enforced by Supabase
- No service keys exposed in client code

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using React, TypeScript, and Supabase