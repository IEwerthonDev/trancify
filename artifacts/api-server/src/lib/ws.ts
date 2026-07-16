import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { verifyToken } from "./auth.js";
import { logger } from "./logger.js";

// tenantId -> set of live sockets
const tenantSockets = new Map<string, Set<WebSocket>>();

export interface PaymentEvent {
  type: "payment";
  appointmentId: string;
  clientName: string;
  serviceName: string;
  paymentType: "deposit" | "full";
  amount: number;
  paymentStatus: string;
  provider: "infinitepay" | "simulated";
  paidAt: string;
}

export function emitToTenant(tenantId: string, event: PaymentEvent): void {
  const sockets = tenantSockets.get(tenantId);
  if (!sockets || sockets.size === 0) return;
  const payload = JSON.stringify(event);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
      } catch {
        // ignore individual socket failures
      }
    }
  }
}

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    let url: URL;
    try {
      url = new URL(req.url ?? "", "http://localhost");
    } catch {
      socket.destroy();
      return;
    }
    if (url.pathname !== "/api/ws" && url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    const token = url.searchParams.get("token");
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    let tenantId: string | null = null;
    try {
      const payload = verifyToken(token);
      if (payload?.role === "tenant" && payload?.tenantId) {
        tenantId = String(payload.tenantId);
      }
    } catch {
      // invalid token
    }

    if (!tenantId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      let set = tenantSockets.get(tenantId!);
      if (!set) {
        set = new Set();
        tenantSockets.set(tenantId!, set);
      }
      set.add(ws);
      logger.info({ tenantId }, "WS client connected");

      ws.on("close", () => {
        set!.delete(ws);
        if (set!.size === 0) tenantSockets.delete(tenantId!);
      });
      ws.on("error", () => {
        set!.delete(ws);
      });
    });
  });

  logger.info("WebSocket server attached at /api/ws");
}
