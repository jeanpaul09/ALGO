import { WebSocketServer, WebSocket } from 'ws';

export interface WSMessage {
  type: string;
  data: any;
}

export class WebSocketManager {
  private clients: Set<WebSocket> = new Set();

  constructor(private wss: WebSocketServer) {
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket client connected');
      this.clients.add(ws);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send initial connection confirmation
      this.sendToClient(ws, { type: 'connected', data: { timestamp: new Date() } });
    });
  }

  private handleMessage(ws: WebSocket, message: WSMessage) {
    // Handle client-to-server messages if needed
    console.log('Received message:', message);
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
