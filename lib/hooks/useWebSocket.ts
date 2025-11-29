import { useEffect, useRef, useState, useCallback } from 'react';

export interface MarketUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  volume?: number;
  bid?: number;
  ask?: number;
}

export interface AISignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string[];
  indicators: {
    name: string;
    value: number;
    signal: 'bullish' | 'bearish' | 'neutral';
  }[];
  zones?: {
    type: 'support' | 'resistance' | 'liquidity';
    price: number;
    strength: number;
  }[];
}

interface UseWebSocketOptions {
  url: string;
  symbol: string;
  onMarketUpdate?: (data: MarketUpdate) => void;
  onAISignal?: (data: AISignal) => void;
  reconnectInterval?: number;
}

export function useWebSocket({
  url,
  symbol,
  onMarketUpdate,
  onAISignal,
  reconnectInterval = 3000,
}: UseWebSocketOptions) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<MarketUpdate | null>(null);
  const [lastSignal, setLastSignal] = useState<AISignal | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      // Use WebSocket URL from env or fallback to localhost
      const wsUrl = url || 'ws://localhost:3001';
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        console.log('[WebSocket] Connected');

        // Subscribe to market data for symbol
        ws.current?.send(JSON.stringify({
          type: 'subscribe',
          channel: 'market',
          symbol,
        }));

        // Subscribe to AI signals
        ws.current?.send(JSON.stringify({
          type: 'subscribe',
          channel: 'ai_signals',
          symbol,
        }));
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'market_update') {
            const update: MarketUpdate = data.data;
            setLastUpdate(update);
            onMarketUpdate?.(update);
          } else if (data.type === 'ai_signal') {
            const signal: AISignal = data.data;
            setLastSignal(signal);
            onAISignal?.(signal);
          }
        } catch (err) {
          console.error('[WebSocket] Parse error:', err);
        }
      };

      ws.current.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        console.log('[WebSocket] Disconnected');

        // Attempt reconnection
        reconnectTimeout.current = setTimeout(() => {
          console.log('[WebSocket] Reconnecting...');
          connect();
        }, reconnectInterval);
      };
    } catch (err) {
      console.error('[WebSocket] Connection error:', err);
      setIsConnected(false);
    }
  }, [url, symbol, onMarketUpdate, onAISignal, reconnectInterval]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    isConnected,
    lastUpdate,
    lastSignal,
    sendMessage,
  };
}
