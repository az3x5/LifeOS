# Setup Vercel Environment Variables (PowerShell)
# This script adds the required environment variables to your Vercel project

Write-Host "🚀 Setting up Vercel Environment Variables..." -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI is not installed." -ForegroundColor Red
    Write-Host "📦 Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

Write-Host "✅ Vercel CLI is ready" -ForegroundColor Green
Write-Host ""

# Login to Vercel
Write-Host "🔐 Logging in to Vercel..." -ForegroundColor Cyan
vercel login

Write-Host ""
Write-Host "🔗 Linking to your project..." -ForegroundColor Cyan
vercel link --yes

Write-Host ""
Write-Host "📝 Adding environment variables..." -ForegroundColor Cyan
Write-Host ""

# Add VITE_SUPABASE_URL
Write-Host "Adding VITE_SUPABASE_URL..." -ForegroundColor Yellow
"https://lobqjdkqrlqhohbcjlzg.supabase.co" | vercel env add VITE_SUPABASE_URL production
"https://lobqjdkqrlqhohbcjlzg.supabase.co" | vercel env add VITE_SUPABASE_URL preview
"https://lobqjdkqrlqhohbcjlzg.supabase.co" | vercel env add VITE_SUPABASE_URL development

Write-Host ""
Write-Host "Adding VITE_SUPABASE_ANON_KEY..." -ForegroundColor Yellow
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvYnFqZGtxcmxxaG9oYmNqbHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTAxNTUsImV4cCI6MjA3NzY4NjE1NX0.TD2oOta9oKSBqpLtvabFbRgzYWI0pRPrM9j1IKR95d4" | vercel env add VITE_SUPABASE_ANON_KEY production
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvYnFqZGtxcmxxaG9oYmNqbHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTAxNTUsImV4cCI6MjA3NzY4NjE1NX0.TD2oOta9oKSBqpLtvabFbRgzYWI0pRPrM9j1IKR95d4" | vercel env add VITE_SUPABASE_ANON_KEY preview
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvYnFqZGtxcmxxaG9oYmNqbHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTAxNTUsImV4cCI6MjA3NzY4NjE1NX0.TD2oOta9oKSBqpLtvabFbRgzYWI0pRPrM9j1IKR95d4" | vercel env add VITE_SUPABASE_ANON_KEY development

Write-Host ""
Write-Host "✅ Environment variables added successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Deploying to production..." -ForegroundColor Cyan
vercel --prod

Write-Host ""
Write-Host "✅ Done! Your app should now work on Vercel." -ForegroundColor Green
Write-Host "🔗 Visit: https://life-os-mu-ruddy.vercel.app/test-env.html" -ForegroundColor Cyan
Write-Host ""

