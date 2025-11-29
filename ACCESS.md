# 🚀 Quick Access Guide

Your AI Trading Lab is **running and ready**! Here's how to view it in your browser:

## ✅ Servers Running

- **Frontend**: http://localhost:3000 (Mission Control Dashboard)
- **Backend**: http://localhost:3001 (Trading API)

## 🌐 Access the App from Your Browser

Since you're on a remote server, use one of these methods:

### Method 1: SSH Port Forwarding (Simplest)

**On your LOCAL computer** (Mac/Windows/Linux), open a terminal and run:

```bash
ssh -L 3000:localhost:3000 -L 3001:localhost:3001 <username>@<server-ip>
```

Replace:
- `<username>` with your server username
- `<server-ip>` with your server's IP address

Then open **http://localhost:3000** in your browser!

### Method 2: VSCode Remote SSH (If using VSCode)

1. Connect to your server via "Remote-SSH" in VSCode
2. Open Command Palette (`Cmd/Ctrl + Shift + P`)
3. Type: **"Forward a Port"**
4. Enter: **3000**
5. Click the generated forwarded URL
6. Your app opens in your browser! 🎉

### Method 3: Deploy to Free Cloud (For permanent access)

See `DEPLOYMENT.md` for deploying to Vercel + Render (100% free, no credit card).

## 🎯 What to Do Once It Opens

1. **Dashboard** - View stats, active sessions, PnL
2. **Strategies** - See 6 built-in trading strategies
3. **Backtests** - Run simulations on historical data
4. **Sessions** - Start demo/paper trading
5. **Settings** - Configure risk management

## 🔧 Quick CLI Access (Without Browser)

Test the API directly:

```bash
# Health check
curl http://localhost:3001/health

# List strategies
curl http://localhost:3001/api/strategies | json_pp

# Get system info
curl http://localhost:3001/api/system/info | json_pp

# List active sessions
curl http://localhost:3001/api/sessions | json_pp
```

## 📱 Screenshots

Want to see what it looks like? Run this on the server:

```bash
./screenshots.sh
```

(Generates screenshots of the UI in `screenshots/` folder)

## ❓ Troubleshooting

**"Connection refused" when accessing localhost:3000**
- Servers may have stopped. Restart with: `npm run dev`

**"SSH: Permission denied"**
- Check your SSH key/credentials
- Ensure you have SSH access to the server

**"Port already in use"**
- Ports 3000/3001 are occupied
- Kill existing processes: `lsof -ti:3000 | xargs kill -9`

---

**Need help?** Check `DEPLOYMENT.md` for cloud hosting or contact support.
