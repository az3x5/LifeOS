#!/bin/bash

# Setup Vercel Environment Variables
# This script adds the required environment variables to your Vercel project

echo "🚀 Setting up Vercel Environment Variables..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI is not installed."
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "✅ Vercel CLI is ready"
echo ""

# Login to Vercel
echo "🔐 Logging in to Vercel..."
vercel login

echo ""
echo "🔗 Linking to your project..."
vercel link --yes

echo ""
echo "📝 Adding environment variables..."
echo ""

# Add VITE_SUPABASE_URL
echo "Adding VITE_SUPABASE_URL..."
echo "https://lobqjdkqrlqhohbcjlzg.supabase.co" | vercel env add VITE_SUPABASE_URL production
echo "https://lobqjdkqrlqhohbcjlzg.supabase.co" | vercel env add VITE_SUPABASE_URL preview
echo "https://lobqjdkqrlqhohbcjlzg.supabase.co" | vercel env add VITE_SUPABASE_URL development

echo ""
echo "Adding VITE_SUPABASE_ANON_KEY..."
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvYnFqZGtxcmxxaG9oYmNqbHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTAxNTUsImV4cCI6MjA3NzY4NjE1NX0.TD2oOta9oKSBqpLtvabFbRgzYWI0pRPrM9j1IKR95d4" | vercel env add VITE_SUPABASE_ANON_KEY production
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvYnFqZGtxcmxxaG9oYmNqbHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTAxNTUsImV4cCI6MjA3NzY4NjE1NX0.TD2oOta9oKSBqpLtvabFbRgzYWI0pRPrM9j1IKR95d4" | vercel env add VITE_SUPABASE_ANON_KEY preview
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvYnFqZGtxcmxxaG9oYmNqbHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTAxNTUsImV4cCI6MjA3NzY4NjE1NX0.TD2oOta9oKSBqpLtvabFbRgzYWI0pRPrM9j1IKR95d4" | vercel env add VITE_SUPABASE_ANON_KEY development

echo ""
echo "✅ Environment variables added successfully!"
echo ""
echo "🚀 Deploying to production..."
vercel --prod

echo ""
echo "✅ Done! Your app should now work on Vercel."
echo "🔗 Visit: https://life-os-mu-ruddy.vercel.app/test-env.html"
echo ""

