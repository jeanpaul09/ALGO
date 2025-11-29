#!/bin/bash

echo "=================================="
echo "🚀 AI Trading Lab - Access Guide"
echo "=================================="
echo ""

# Check if servers are running
BACKEND_RUNNING=$(curl -s http://localhost:3001/health 2>/dev/null && echo "✅" || echo "❌")
FRONTEND_RUNNING=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|301\|302" && echo "✅" || echo "❌")

echo "Server Status:"
echo "  Backend (3001):  $BACKEND_RUNNING"
echo "  Frontend (3000): $FRONTEND_RUNNING"
echo ""

# Try to detect environment
if [ -n "$SSH_CLIENT" ] || [ -n "$SSH_TTY" ]; then
    # User is connected via SSH
    echo "📡 You're connected via SSH. Here's how to access the app:"
    echo ""
    echo "Option 1: SSH Port Forwarding (Recommended)"
    echo "  On your LOCAL machine, run:"
    echo "  ssh -L 3000:localhost:3000 -L 3001:localhost:3001 $(whoami)@$(hostname -I | awk '{print $1}')"
    echo ""
    echo "  Then open in your browser:"
    echo "  http://localhost:3000"
    echo ""
    echo "Option 2: Use VSCode Port Forwarding"
    echo "  If using VSCode Remote SSH:"
    echo "  1. Open Command Palette (Cmd/Ctrl+Shift+P)"
    echo "  2. Type: 'Forward a Port'"
    echo "  3. Enter: 3000"
    echo "  4. Click the forwarded URL"
    echo ""
else
    # Local environment - try to open browser
    echo "🌐 Opening browser..."

    if command -v xdg-open > /dev/null; then
        xdg-open http://localhost:3000 2>/dev/null &
    elif command -v open > /dev/null; then
        open http://localhost:3000 2>/dev/null &
    elif command -v wslview > /dev/null; then
        wslview http://localhost:3000 2>/dev/null &
    else
        echo "  Could not auto-open browser. Please visit:"
        echo "  http://localhost:3000"
    fi
    echo ""
fi

echo "=================================="
echo "📚 API Documentation:"
echo "  Backend API: http://localhost:3001/api"
echo "  System Info: http://localhost:3001/api/system/info"
echo "  Health Check: http://localhost:3001/health"
echo ""
echo "🔧 Quick Test:"
echo "  curl http://localhost:3001/health"
echo "  curl http://localhost:3001/api/strategies"
echo "=================================="
