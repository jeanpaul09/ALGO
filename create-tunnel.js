#!/usr/bin/env node

const localtunnel = require('localtunnel');

(async () => {
  console.log('🌐 Creating public tunnels for AI Trading Lab...\n');

  try {
    // Create tunnel for frontend
    const frontendTunnel = await localtunnel({
      port: 3000,
      subdomain: `ai-trading-${Date.now()}`
    });

    console.log('✅ Frontend tunnel created!');
    console.log('   Frontend URL:', frontendTunnel.url);
    console.log('');

    // Create tunnel for backend
    const backendTunnel = await localtunnel({
      port: 3001,
      subdomain: `ai-trading-api-${Date.now()}`
    });

    console.log('✅ Backend tunnel created!');
    console.log('   Backend URL:', backendTunnel.url);
    console.log('');

    console.log('================================');
    console.log('🎉 YOUR APP IS NOW PUBLIC!');
    console.log('================================');
    console.log('');
    console.log('👉 Open this URL in your browser:');
    console.log(`   ${frontendTunnel.url}`);
    console.log('');
    console.log('📡 Backend API available at:');
    console.log(`   ${backendTunnel.url}`);
    console.log('');
    console.log('⚠️  Note: Keep this process running to maintain tunnels');
    console.log('   Press Ctrl+C to stop');
    console.log('================================');

    // Keep process alive
    frontendTunnel.on('close', () => {
      console.log('Frontend tunnel closed');
      process.exit();
    });

    backendTunnel.on('close', () => {
      console.log('Backend tunnel closed');
      process.exit();
    });

  } catch (err) {
    console.error('❌ Error creating tunnels:', err.message);
    console.log('\nFalling back to instructions...\n');
    console.log('Your servers are running on:');
    console.log('  - Frontend: http://localhost:3000');
    console.log('  - Backend: http://localhost:3001');
    console.log('\nTo access from your local machine, use SSH port forwarding:');
    console.log('  ssh -L 3000:localhost:3000 -L 3001:localhost:3001 user@your-server');
  }
})();
