#!/bin/bash

clear

echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║     🚀 DEPLOY AI TRADING LAB (100% FREE) 🚀           ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "This will deploy your app to Vercel's free tier."
echo "No credit card required!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Step 1: Login to Vercel"
echo ""
read -p "Press ENTER to open Vercel login..."

cd frontend

# Login to Vercel
npx vercel login

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Step 2: Deploying Frontend to Vercel..."
echo ""

# Deploy frontend
FRONTEND_URL=$(npx vercel --prod --yes 2>&1 | grep -o 'https://[^ ]*\.vercel\.app' | tail -1)

if [ -z "$FRONTEND_URL" ]; then
    echo ""
    echo "❌ Deployment failed. Please run manually:"
    echo ""
    echo "   cd frontend"
    echo "   npx vercel login"
    echo "   npx vercel --prod"
    echo ""
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo ""
echo "🌐 Your AI Trading Lab is live at:"
echo ""
echo "   $FRONTEND_URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Open: $FRONTEND_URL"
echo "2. Backend is currently running locally on port 3001"
echo "3. To deploy backend to Render (free), see DEPLOYMENT.md"
echo ""
echo "For now, the frontend will show 'No strategies' until backend is deployed."
echo ""
