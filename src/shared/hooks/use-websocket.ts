'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuthStore } from '@/features/auth/store/auth-store'

// ── Event types emitted by the WMS backend over WebSocket ──────────────────

export type WmsEventType =
  | 'task.assigned'
  | 'task.started'
  | 'task.completed'
  | 'task.failed'
  | 'task.cancelled'
  | 'order.status_changed'
  | 'order.item_added'
  | 'inventory.moved'
  | 'inventory.received'
  | 'warehouse.utilization_updated'
  | 'ping'

export interface WmsEvent<T = unknown> {
  type: WmsEventType
  payload: T
  tenantId: string
  warehouseId?: string
  timestamp: string
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseWebSocketOptions {
  /** Called for every event received */
  onEvent?: (event: WmsEvent) => void
  /** Auto-reconnect delay in ms (default: 3000) */
  reconnectDelay?: number
  /** Max reconnect attempts (default: 10) */
  maxAttempts?: number
  /** Enabled flag (default: true) */
  enabled?: boolean
}

const WS_BASE = (process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3030').replace(/^http/, 'ws')

/** Global event emitter so multiple components can subscribe without multiple WS connections */
const listeners = new Set<(e: WmsEvent) => void>()
let globalWs: WebSocket | null = null
let globalStatus: ConnectionStatus = 'disconnected'
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let attempts = 0
const MAX_ATTEMPTS = 10
const RECONNECT_DELAY = 3000

function connectGlobal(token: string) {
  if (globalWs && globalWs.readyState < WebSocket.CLOSING) return

  globalStatus = 'connecting'
  try {
    globalWs = new WebSocket(`${WS_BASE}/ws?token=${encodeURIComponent(token)}`)
  } catch {
    globalStatus = 'error'
    return
  }

  globalWs.onopen = () => {
    globalStatus = 'connected'
    attempts = 0
  }

  globalWs.onmessage = (e) => {
    try {
      const event: WmsEvent = JSON.parse(e.data as string)
      listeners.forEach((fn) => fn(event))
    } catch {
      // ignore malformed messages
    }
  }

  globalWs.onerror = () => {
    globalStatus = 'error'
  }

  globalWs.onclose = () => {
    globalStatus = 'disconnected'
    globalWs = null
    if (attempts < MAX_ATTEMPTS) {
      attempts++
      reconnectTimer = setTimeout(() => connectGlobal(token), RECONNECT_DELAY)
    }
  }
}

function disconnectGlobal() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  globalWs?.close()
  globalWs = null
  globalStatus = 'disconnected'
  attempts = 0
}

/**
 * Hook that connects to the WMS WebSocket server and receives real-time events.
 *
 * Usage:
 * ```ts
 * const { status } = useWmsWebSocket({
 *   onEvent: (e) => {
 *     if (e.type === 'task.assigned') queryClient.invalidateQueries({ queryKey: ['tasks'] })
 *   }
 * })
 * ```
 */
export function useWmsWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onEvent,
    enabled = true,
  } = options

  const { accessToken } = useAuthStore()
  const [status, setStatus] = useState<ConnectionStatus>(globalStatus)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  // Register this component's listener
  useEffect(() => {
    const listener = (e: WmsEvent) => onEventRef.current?.(e)
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  // Connect / disconnect based on auth + enabled flag
  useEffect(() => {
    if (!enabled || !accessToken) return
    connectGlobal(accessToken)

    // Poll status for display purposes
    const interval = setInterval(() => {
      setStatus(globalStatus)
    }, 1000)

    return () => {
      clearInterval(interval)
      // Only fully disconnect when no listeners remain
      if (listeners.size === 0) disconnectGlobal()
    }
  }, [enabled, accessToken])

  /** Manually send a message to the server */
  const send = useCallback((data: unknown) => {
    if (globalWs?.readyState === WebSocket.OPEN) {
      globalWs.send(JSON.stringify(data))
    }
  }, [])

  return { status, send }
}
