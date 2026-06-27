'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export interface WSMessage {
  type: string;
  surah?: number;
  ayah?: number;
  page?: number;
  displayMode?: string;
  query?: string;
  keywords?: string[];
  translation?: string;
  surah_name?: string;
  juz?: number;
  score?: number;
  team?: string;
  timer?: number;
  transcription?: string;
  confidence?: number;
  timestamp?: number;
  [key: string]: unknown;
}

function getWSUrl(role: string): string {
  if (typeof window === 'undefined') return '';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  const port = '3004';
  return protocol + '//' + hostname + ':' + port + '/?role=' + role;
}

export function useWebSocket(role: 'controller' | 'display') {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [clientCount, setClientCount] = useState({ controllers: 0, displays: 0 });
  const listeners = useRef<((msg: WSMessage) => void)[]>([]);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addListener = useCallback((fn: (msg: WSMessage) => void) => {
    listeners.current.push(fn);
    return () => { listeners.current = listeners.current.filter(l => l !== fn); };
  }, []);

  const send = useCallback((msg: WSMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ ...msg, timestamp: Date.now() }));
    }
  }, []);

  const connect = useCallback(() => {
    const url = getWSUrl(role);
    if (!url) return;
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSMessage;
        if (data.type === 'connected') {
          setClientCount(data.clients as { controllers: number; displays: number });
        } else {
          listeners.current.forEach(fn => fn(data));
        }
      } catch { /* ignore JSON parse errors */ }
    };
    socket.onclose = () => {
      setConnected(false);
      ws.current = null;
      reconnectTimer.current = setTimeout(connect, 3000);
    };
    socket.onerror = () => {};
  }, [role]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  return { connected, clientCount, send, addListener };
}


