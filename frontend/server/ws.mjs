/**
 * QLVRS WebSocket Server — bridges operator controller ? display clients.
 * Run: node server/ws.mjs
 * Port: 3001
 */
import { WebSocketServer } from "ws";

const PORT = process.env.WS_PORT || 3001;
const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });

const clients = {
  controllers: new Set(),
  displays: new Set(),
};

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", "http://" + req.headers.host);
  const role = url.searchParams.get("role") || "display";

  if (role === "controller") {
    clients.controllers.add(ws);
    console.log("Controller connected (" + clients.controllers.size + " total)");

    ws.on("message", (data) => {
      const msg = data.toString();
      console.log("Controller:", msg.substring(0, 100));
      for (const display of clients.displays) {
        if (display.readyState === 1) {
          display.send(msg);
        }
      }
    });

    ws.on("close", () => {
      clients.controllers.delete(ws);
      console.log("Controller disconnected (" + clients.controllers.size + " remaining)");
    });

  } else {
    clients.displays.add(ws);
    console.log("Display connected (" + clients.displays.size + " total)");

    ws.on("close", () => {
      clients.displays.delete(ws);
      console.log("Display disconnected (" + clients.displays.size + " remaining)");
    });
  }

  ws.send(JSON.stringify({ type: "connected", role, clients: { controllers: clients.controllers.size, displays: clients.displays.size } }));
});

console.log("QLVRS WebSocket Server running on ws://localhost:" + PORT);
console.log("Connect as: ws://localhost:3001/?role=controller (operator)");
console.log("       or: ws://localhost:3001/?role=display (projector)");

