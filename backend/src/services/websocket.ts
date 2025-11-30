import { WebSocketServer, WebSocket } from 'ws';

export interface WSMessage {
  type: string;
  data: any;
}

export class WebSocketManager {
  private clients: Set<WebSocket> = new Set();
  private messageHandlers: Map<string, (ws: WebSocket, data: any) => void> = new Map();

  constructor(private wss: WebSocketServer) {
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('✅ New WebSocket client connected. Total clients:', this.clients.size + 1);
      this.clients.add(ws);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('📩 WebSocket message received:', data);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('❌ Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('❌ WebSocket client disconnected. Total clients:', this.clients.size - 1);
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send initial connection confirmation
      console.log('📤 Sending connection confirmation to client');
      this.sendToClient(ws, { type: 'connected', data: { timestamp: new Date() } });
    });
  }

  private handleMessage(ws: WebSocket, message: WSMessage) {
    // Check for registered handlers
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      console.log(`🔧 Calling handler for message type: ${message.type}`);
      handler(ws, message.data);
    } else {
      console.log(`⚠️  Unhandled message type: ${message.type}`);
    }
  }

  /**
   * Register a handler for a specific message type
   */
  onMessage(type: string, handler: (ws: WebSocket, data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  sendToClient(client: WebSocket, message: WSMessage) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  broadcast(message: WSMessage) {
    const payload = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  broadcastPositionUpdate(sessionId: string, position: any) {
    this.broadcast({
      type: 'position_update',
      data: { sessionId, position },
    });
  }

  broadcastTradeExecuted(sessionId: string, trade: any) {
    this.broadcast({
      type: 'trade_executed',
      data: { sessionId, trade },
    });
  }

  broadcastSessionStatus(sessionId: string, status: string) {
    this.broadcast({
      type: 'session_status',
      data: { sessionId, status },
    });
  }

  broadcastPnLUpdate(sessionId: string, pnl: number) {
    this.broadcast({
      type: 'pnl_update',
      data: { sessionId, pnl },
    });
  }
}
