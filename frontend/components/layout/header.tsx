'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useWebSocket, WSMessage } from '@/lib/websocket';
import { Wifi, WifiOff } from 'lucide-react';

export function Header() {
  const [connected, setConnected] = useState(false);

  const { connected: wsConnected } = useWebSocket((message: WSMessage) => {
    // Handle real-time updates
    console.log('WebSocket message:', message);
  });

  useEffect(() => {
    setConnected(wsConnected);
  }, [wsConnected]);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Mission Control</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <Badge variant="success">Live</Badge>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <Badge variant="destructive">Disconnected</Badge>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
