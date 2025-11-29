# Free Deployment Guide

This guide shows how to deploy the AI Trading Lab MVP using **100% free tiers** - no credit card required.

## Overview

- **Frontend**: Vercel (Free tier - no credit card needed)
- **Backend**: Render (Free tier - no credit card needed)
- **Total cost**: $0/month

## Step 1: Deploy Backend to Render (Free)

1. Go to [render.com](https://render.com) and sign up (free, no credit card)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `jeanpaul09/ALGO`
4. Configure:
   - **Name**: `ai-trading-lab-api`
   - **Branch**: `claude/ai-trading-lab-mvp-01BfJC3Q6ENWkXNetAZVULWG`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Add environment variable:
   - `NODE_ENV` = `production`
6. Click "Create Web Service"
7. Wait for deployment (5-10 minutes)
8. **Copy your backend URL** (e.g., `https://ai-trading-lab-api.onrender.com`)

## Step 2: Deploy Frontend to Vercel (Free)

1. Go to [vercel.com](https://vercel.com) and sign up (free, no credit card)
2. Click "Add New..." → "Project"
3. Import your GitHub repository: `jeanpaul09/ALGO`
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Add environment variable:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: Your Render backend URL from Step 1 (e.g., `https://ai-trading-lab-api.onrender.com`)
6. Click "Deploy"
7. Wait for deployment (2-3 minutes)
8. **Your app is live!** Click the URL to view

## Step 3: Test Your Deployment

1. Open your Vercel URL (e.g., `https://algo-frontend.vercel.app`)
2. You should see the Mission Control dashboard
3. Navigate through:
   - Dashboard (see stats and active sessions)
   - Strategies (view 6 built-in strategies)
   - Backtests (run simulations)
   - Sessions (start demo trading)

## Alternative: Quick Deploy Buttons

### Deploy Backend to Render
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Deploy Frontend to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jeanpaul09/ALGO&root-directory=frontend&env=NEXT_PUBLIC_API_URL)

## Notes

- **Free tier limits**:
  - Render: 750 hours/month, sleeps after 15 min inactivity (wakes on request)
  - Vercel: Unlimited bandwidth, 100 deployments/day
- **First load**: Backend may take 30-60 seconds to wake up from sleep
- **Database**: Uses JSON file storage (persists on Render's free tier)
- **No credit card**: Both services offer free tiers without payment info

## Troubleshooting

### Backend not responding
- Wait 60 seconds (Render free tier sleeps and needs to wake up)
- Check Render logs for errors

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` environment variable is set correctly in Vercel
- Check CORS settings in backend if needed

### Data not persisting
- Render free tier includes 512MB disk space for JSON database
- Data persists across restarts
