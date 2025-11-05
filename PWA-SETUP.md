# 📱 PWA Setup Guide for LifeOS

LifeOS is now a **Progressive Web App (PWA)**! This means users can install it on their devices and use it offline.

## ✨ Features

### 🚀 Installation
- **Install on any device** - Desktop, mobile, or tablet
- **Works like a native app** - Appears in app drawer/home screen
- **No app store required** - Install directly from the browser

### 📴 Offline Support
- **Works without internet** - Access your data anytime
- **Smart caching** - Automatically caches app resources
- **Background sync** - Syncs when connection is restored

### ⚡ Performance
- **Fast loading** - Cached resources load instantly
- **Reduced data usage** - Only downloads updates when needed
- **Service worker** - Handles caching and offline functionality

---

## 🛠️ Setup Instructions

### 1. Generate PWA Icons

The PWA requires icons in multiple sizes. We've created a tool to generate them:

#### Option A: Use the Icon Generator (Recommended)
1. Start the dev server: `npm run dev`
2. Open `http://localhost:3000/generate-icons.html` in your browser
3. Click "Download All Icons" button
4. Save all generated icons to the `public/` folder

#### Option B: Manual Generation
If you have ImageMagick installed:

```bash
# Install ImageMagick first (if not installed)
# Windows: choco install imagemagick
# Mac: brew install imagemagick
# Linux: sudo apt-get install imagemagick

# Generate all icon sizes
magick convert -background none -resize 72x72 public/icon.svg public/icon-72x72.png
magick convert -background none -resize 96x96 public/icon.svg public/icon-96x96.png
magick convert -background none -resize 128x128 public/icon.svg public/icon-128x128.png
magick convert -background none -resize 144x144 public/icon.svg public/icon-144x144.png
magick convert -background none -resize 152x152 public/icon.svg public/icon-152x152.png
magick convert -background none -resize 192x192 public/icon.svg public/icon-192x192.png
magick convert -background none -resize 384x384 public/icon.svg public/icon-384x384.png
magick convert -background none -resize 512x512 public/icon.svg public/icon-512x512.png
```

#### Option C: Online Tool
1. Go to https://realfavicongenerator.net/
2. Upload `public/icon.svg`
3. Generate and download all icons
4. Extract to `public/` folder

### 2. Build the App

```bash
npm run build
```

The build process will:
- ✅ Generate service worker (`sw.js`)
- ✅ Create web manifest (`manifest.webmanifest`)
- ✅ Set up caching strategies
- ✅ Enable offline support

### 3. Deploy to Vercel

```bash
# Push to GitHub
git add .
git commit -m "Enable PWA features"
git push

# Deploy on Vercel
# The PWA will automatically work on your deployed site
```

---

## 📲 How Users Install the App

### On Desktop (Chrome, Edge, Brave)
1. Visit your LifeOS website
2. Look for the install icon in the address bar (⊕ or 🔽)
3. Click "Install LifeOS"
4. The app will open in its own window

### On Android (Chrome, Samsung Internet)
1. Visit your LifeOS website
2. Tap the menu (⋮) → "Add to Home screen" or "Install app"
3. Confirm installation
4. Find LifeOS in your app drawer

### On iOS (Safari)
1. Visit your LifeOS website
2. Tap the Share button (□↑)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"
5. Find LifeOS on your home screen

### On Desktop (Firefox)
1. Visit your LifeOS website
2. Click the menu (☰) → "Install LifeOS"
3. Confirm installation

---

## 🔧 PWA Configuration

### Manifest (`public/manifest.json`)
- **Name**: LifeOS - Personal Life Management System
- **Short Name**: LifeOS
- **Theme Color**: #00A99D (Teal)
- **Background Color**: #1A2E35 (Dark)
- **Display**: Standalone (full-screen app)
- **Orientation**: Portrait (mobile-friendly)

### Service Worker (`vite.config.ts`)
- **Strategy**: GenerateSW (automatic)
- **Update**: Auto-update on new version
- **Caching**:
  - App resources (HTML, CSS, JS)
  - Google Fonts (1 year cache)
  - Tailwind CSS (30 days cache)
  - Supabase API (5 minutes cache, network-first)

### Offline Support
- ✅ All app pages work offline
- ✅ Local data (Dexie) always accessible
- ✅ Cloud sync when online
- ✅ Automatic retry on connection restore

---

## 🎨 Customization

### Change App Colors
Edit `vite.config.ts`:
```typescript
manifest: {
  theme_color: '#00A99D',        // Browser UI color
  background_color: '#1A2E35',   // Splash screen color
}
```

### Change App Name
Edit `vite.config.ts`:
```typescript
manifest: {
  name: 'Your App Name',
  short_name: 'YourApp',
}
```

### Add Shortcuts
Edit `public/manifest.json`:
```json
"shortcuts": [
  {
    "name": "Quick Add",
    "url": "/?action=add",
    "icons": [{ "src": "/icon-96x96.png", "sizes": "96x96" }]
  }
]
```

---

## 🧪 Testing PWA

### Local Testing
```bash
npm run build
npm run preview
```

Then open Chrome DevTools:
1. Go to **Application** tab
2. Check **Manifest** section
3. Check **Service Workers** section
4. Test **Offline** mode

### Lighthouse Audit
1. Open Chrome DevTools
2. Go to **Lighthouse** tab
3. Select **Progressive Web App**
4. Click **Generate report**
5. Aim for 100% PWA score

### PWA Checklist
- ✅ HTTPS enabled (required for PWA)
- ✅ Service worker registered
- ✅ Web manifest present
- ✅ Icons in multiple sizes
- ✅ Works offline
- ✅ Fast loading (< 3s)
- ✅ Responsive design
- ✅ Install prompt

---

## 🐛 Troubleshooting

### Icons Not Showing
- Make sure all icon files exist in `public/` folder
- Check browser console for 404 errors
- Verify icon paths in manifest

### Service Worker Not Registering
- Ensure HTTPS is enabled (required for PWA)
- Check browser console for errors
- Clear browser cache and reload

### Install Prompt Not Appearing
- PWA criteria must be met (HTTPS, manifest, service worker)
- User must visit site at least twice
- User hasn't dismissed prompt before
- Check `localStorage` for `pwa-install-dismissed`

### Offline Mode Not Working
- Service worker must be registered
- Visit site at least once while online
- Check DevTools → Application → Service Workers

---

## 📚 Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

---

## 🎉 Benefits for Users

- 📱 **Install like a native app** - No app store needed
- 📴 **Works offline** - Access data anytime, anywhere
- ⚡ **Faster loading** - Cached resources load instantly
- 🔔 **Push notifications** - Stay updated (coming soon)
- 💾 **Less storage** - Smaller than native apps
- 🔄 **Auto-updates** - Always get the latest version
- 🌐 **Cross-platform** - Works on all devices

---

**Your LifeOS is now a Progressive Web App! 🚀**

