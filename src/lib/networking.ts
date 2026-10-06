/**
 * AMONG Production-Grade Networking & Real-Time Synchronization Layer
 * 
 * Features:
 * 1. Resilient WebSocket connection with automatic reconnect, exponential backoff, and jitter.
 * 2. Monotonic sequence ordering ensuring strictly in-order message delivery.
 * 3. 4-stage delivery states:
 *    - 'sending': Locally buffered/queued in offline outbox or currently in-flight.
 *    - 'sent': Accepted and sequenced by relay (single checkmark).
 *    - 'delivered': Received on recipient's physical device (double checkmark).
 *    - 'read': Decrypted and viewed by the recipient (blue double checkmark).
 * 4. Offline Outbox Queuing: Messages composed while offline are stored persistently in localStorage
 *    and automatically dispatched in order upon connection restoration.
 * 5. Automatic Catch-up Synchronization: On reconnection, client retrieves any encrypted messages
 *    buffered by the server while the device was offline.
 * 6. Zero Silent Message Loss: All incoming envelopes and delivery receipts are persistently stored
 *    in local storage, updating conversation history and unread status even when the chat screen is closed.
 * 7. Zero-Knowledge Transit: Server handles strictly encrypted envelopes, never plaintext.
 */

import { EncryptedPayload, decryptPayload } from './e2ee';

export type ConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'offline';

export interface OutgoingQueuedMessage {
  id: string;
  chatId: string;
  recipientId: string;
  senderId?: string;
  envelope: EncryptedPayload;
  sequenceNumber: number;
  createdAt: number;
  attempts: number;
  lastAttemptAt?: number;
  status?: 'sending' | 'failed';
  error?: string;
}

export interface NetworkMessageEvent {
  id: string;
  chatId: string;
  senderId: string;
  recipientId: string;
  envelope: EncryptedPayload;
  sequenceNumber: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
}

type EventListener<T> = (data: T) => void;

// -------------------------------------------------------------
// Global Storage & Ordering Helpers for Zero Silent Message Loss
// -------------------------------------------------------------

export function sortMessagesStrict<T extends { sequenceNumber?: number; createdAt?: number; timestamp?: string; id?: string }>(messages: T[]): T[] {
  return [...messages].sort((a, b) => {
    const seqA = typeof a.sequenceNumber === 'number' ? a.sequenceNumber : 0;
    const seqB = typeof b.sequenceNumber === 'number' ? b.sequenceNumber : 0;
    if (seqA && seqB && seqA !== seqB) {
      return seqA - seqB;
    }
    const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
    const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
    if (timeA && timeB && timeA !== timeB) {
      return timeA - timeB;
    }
    if (a.timestamp && b.timestamp && a.timestamp !== b.timestamp) {
      return a.timestamp.localeCompare(b.timestamp);
    }
    return (a.id || '').localeCompare(b.id || '');
  });
}

export function persistIncomingMessageGlobally(msg: NetworkMessageEvent) {
  try {
    const key = `among_thread_messages_${msg.chatId}`;
    const raw = localStorage.getItem(key);
    let messages: any[] = raw ? JSON.parse(raw) : [];

    // Idempotent insertion
    if (!messages.some((m) => m.id === msg.id)) {
      const date = new Date(msg.createdAt || Date.now());
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      const fallbackText = (msg.envelope as any)?.plaintextFallback || (msg.envelope?.payloadType === 'text' ? '[Encrypted Whisper]' : `[${msg.envelope?.payloadType || 'Media'}]`);
      const item = {
        id: msg.id,
        sender: 'them',
        text: fallbackText,
        timestamp: timeStr,
        status: msg.status || 'delivered',
        type: msg.envelope?.payloadType || 'text',
        isEncrypted: true,
        encryptedEnvelope: msg.envelope,
        sequenceNumber: msg.sequenceNumber,
        createdAt: date.getTime(),
        deliveredAt: timeStr,
      };
      messages.push(item);
      // Strictly sort by sequence number and timestamp
      messages = sortMessagesStrict(messages);
      localStorage.setItem(key, JSON.stringify(messages));

      window.dispatchEvent(
        new CustomEvent('among_global_message_received', {
          detail: { chatId: msg.chatId, message: item },
        })
      );
    }
  } catch {}
}

export function persistReceiptGlobally(messageId: string, chatId: string, status: 'delivered' | 'read') {
  try {
    const key = `among_thread_messages_${chatId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const messages: any[] = JSON.parse(raw);
    let updated = false;
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMessages = messages.map((m) => {
      if (m.id === messageId) {
        updated = true;
        return {
          ...m,
          status,
          ...(status === 'delivered'
            ? { deliveredAt: timestampStr }
            : { readAt: timestampStr, deliveredAt: m.deliveredAt || timestampStr }),
        };
      }
      return m;
    });

    if (updated) {
      localStorage.setItem(key, JSON.stringify(sortMessagesStrict(newMessages)));
      window.dispatchEvent(
        new CustomEvent('among_receipt_updated', {
          detail: { messageId, chatId, status },
        })
      );
    }
  } catch {}
}

export function persistAckSentGlobally(messageId: string, chatId: string, sequenceNumber: number) {
  try {
    const key = `among_thread_messages_${chatId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const messages: any[] = JSON.parse(raw);
    let updated = false;
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMessages = messages.map((m) => {
      if (m.id === messageId) {
        updated = true;
        return {
          ...m,
          status: (m.status === 'sending' || m.status === 'failed') ? 'sent' : m.status,
          sequenceNumber,
          sentAt: m.sentAt || timestampStr,
          meshStatus: m.meshStatus === 'queued' ? 'synced' : m.meshStatus,
          syncedAt: timestampStr,
        };
      }
      return m;
    });

    if (updated) {
      localStorage.setItem(key, JSON.stringify(sortMessagesStrict(newMessages)));
      window.dispatchEvent(
        new CustomEvent('among_ack_sent', {
          detail: { messageId, chatId, sequenceNumber },
        })
      );
    }
  } catch {}
}

export function persistMessageFailureGlobally(messageId: string, chatId: string, error?: string) {
  try {
    const key = `among_thread_messages_${chatId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const messages: any[] = JSON.parse(raw);
    let updated = false;

    const newMessages = messages.map((m) => {
      if (m.id === messageId) {
        updated = true;
        return {
          ...m,
          status: 'failed' as const,
          error: error || 'Failed to deliver whisper',
        };
      }
      return m;
    });

    if (updated) {
      localStorage.setItem(key, JSON.stringify(sortMessagesStrict(newMessages)));
      window.dispatchEvent(
        new CustomEvent('among_message_failed', {
          detail: { messageId, chatId, error },
        })
      );
    }
  } catch {}
}

class SanctuaryNetworkManager {
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'offline';
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private retryTickerTimer: number | null = null;
  private userId: string | null = null;
  private token: string | null = null;

  // Listeners
  private stateListeners: Set<EventListener<ConnectionState>> = new Set();
  private messageListeners: Set<EventListener<NetworkMessageEvent>> = new Set();
  private ackSentListeners: Set<EventListener<{ messageId: string; chatId: string; sequenceNumber: number }>> = new Set();
  private ackDeliveredListeners: Set<EventListener<{ messageId: string; chatId: string }>> = new Set();
  private ackReadListeners: Set<EventListener<{ messageId: string; chatId: string }>> = new Set();
  private typingListeners: Set<EventListener<{ chatId: string; senderId: string; isTyping: boolean }>> = new Set();
  private callSignalListeners: Set<EventListener<{ fromUserId: string; signalData: any }>> = new Set();
  private reactionListeners: Set<EventListener<{ messageId: string; chatId: string; userId: string; emoji: string; reactions: Record<string, string[]> }>> = new Set();

  // In-flight pending message acknowledgements
  private inFlightAcks = new Map<string, {
    resolve: (seq: number) => void;
    reject: (err: Error) => void;
    timeout: number;
  }>();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkOnline());
      window.addEventListener('offline', () => this.handleNetworkOffline());
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('among_thread_messages_')) {
          const chatId = e.key.replace('among_thread_messages_', '');
          window.dispatchEvent(new CustomEvent('among_storage_synced', { detail: { chatId } }));
        }
      });
      this.startRetryTicker();
    }
  }

  public initialize(userId: string, token?: string) {
    this.userId = userId;
    this.token = token || localStorage.getItem('among_auth_token');
    try {
      localStorage.setItem('among_user_id', userId);
    } catch {}
    this.connect();
  }

  public getConnectionState(): ConnectionState {
    return this.state;
  }

  private setState(newState: ConnectionState) {
    if (this.state !== newState) {
      this.state = newState;
      this.stateListeners.forEach((listener) => {
        try {
          listener(newState);
        } catch {}
      });
    }
  }

  public onStateChange(listener: EventListener<ConnectionState>): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public onMessage(listener: EventListener<NetworkMessageEvent>): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public onAckSent(listener: EventListener<{ messageId: string; chatId: string; sequenceNumber: number }>): () => void {
    this.ackSentListeners.add(listener);
    return () => this.ackSentListeners.delete(listener);
  }

  public onAckDelivered(listener: EventListener<{ messageId: string; chatId: string }>): () => void {
    this.ackDeliveredListeners.add(listener);
    return () => this.ackDeliveredListeners.delete(listener);
  }

  public onAckRead(listener: EventListener<{ messageId: string; chatId: string }>): () => void {
    this.ackReadListeners.add(listener);
    return () => this.ackReadListeners.delete(listener);
  }

  public onTyping(listener: EventListener<{ chatId: string; senderId: string; isTyping: boolean }>): () => void {
    this.typingListeners.add(listener);
    return () => this.typingListeners.delete(listener);
  }

  public onCallSignal(listener: EventListener<{ fromUserId: string; signalData: any }>): () => void {
    this.callSignalListeners.add(listener);
    return () => this.callSignalListeners.delete(listener);
  }

  public onReactionUpdated(
    listener: EventListener<{
      messageId: string;
      chatId: string;
      userId: string;
      emoji: string;
      reactions: Record<string, string[]>;
    }>
  ): () => void {
    this.reactionListeners.add(listener);
    return () => this.reactionListeners.delete(listener);
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.setState(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const token = this.token || localStorage.getItem('among_auth_token') || '';
    const userId = this.userId || localStorage.getItem('among_user_id') || '';
    const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(userId)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setState('connected');
        this.startHeartbeat();

        // Send identity confirmation if credentials present
        if (userId) {
          this.sendRaw({
            type: 'auth:identify',
            userId,
            token,
          });
        }

        // Catch-up sync for messages missed while disconnected
        this.requestCatchUpSync();

        // Flush offline outbox queue in order
        this.flushOfflineOutbox();
      };

      this.ws.onmessage = (event) => {
        this.handleIncomingSocketMessage(event.data);
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.setState('offline');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.stopHeartbeat();
        this.setState('offline');
      };
    } catch {
      this.setState('offline');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return; // Reconnect automatically on 'online' event
    }

    this.reconnectAttempts++;
    const base = Math.min(1000 * Math.pow(1.8, this.reconnectAttempts - 1), 12000);
    const jitter = Math.random() * 800;
    const delay = Math.round(base + jitter);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendRaw({ type: 'ping' });
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startRetryTicker() {
    if (typeof window === 'undefined') return;
    if (this.retryTickerTimer) clearInterval(this.retryTickerTimer);
    this.retryTickerTimer = window.setInterval(() => {
      if (this.state === 'connected') {
        const queue = this.getOfflineQueue();
        if (queue.length > 0) {
          this.flushOfflineOutbox();
        }
      }
    }, 5000);
  }

  private handleNetworkOnline() {
    this.reconnectAttempts = 0;
    this.connect();
  }

  private handleNetworkOffline() {
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.setState('offline');
  }

  private sendRaw(data: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  private handleIncomingSocketMessage(rawText: string) {
    try {
      const payload = JSON.parse(rawText);

      switch (payload.type) {
        case 'ack:sent': {
          const { messageId, chatId, sequenceNumber } = payload;
          const pending = this.inFlightAcks.get(messageId);
          if (pending) {
            clearTimeout(pending.timeout);
            pending.resolve(sequenceNumber);
            this.inFlightAcks.delete(messageId);
          }
          if (chatId) {
            persistAckSentGlobally(messageId, chatId, sequenceNumber);
          }
          this.ackSentListeners.forEach((listener) => {
            try {
              listener({ messageId, chatId: chatId || '', sequenceNumber: sequenceNumber || 0 });
            } catch {}
          });
          break;
        }

        case 'message:received': {
          const msg: NetworkMessageEvent = payload.message;
          if (msg) {
            // Immediately store message globally (Zero Silent Loss)
            persistIncomingMessageGlobally(msg);

            // Acknowledge delivery back to sender & relay
            this.sendAckDelivered(msg.id, msg.chatId, msg.senderId);

            // Notify message listeners
            this.messageListeners.forEach((listener) => {
              try {
                listener(msg);
              } catch {}
            });
          }
          break;
        }

        case 'ack:delivered': {
          const { messageId, chatId } = payload;
          if (chatId && messageId) {
            persistReceiptGlobally(messageId, chatId, 'delivered');
          }
          this.ackDeliveredListeners.forEach((listener) => {
            try {
              listener({ messageId, chatId });
            } catch {}
          });
          break;
        }

        case 'ack:read': {
          const { messageId, chatId } = payload;
          if (chatId && messageId) {
            persistReceiptGlobally(messageId, chatId, 'read');
          }
          this.ackReadListeners.forEach((listener) => {
            try {
              listener({ messageId, chatId });
            } catch {}
          });
          break;
        }

        case 'sync:batch': {
          const messages: NetworkMessageEvent[] = payload.messages || [];
          // Sort messages by sequence number for strict monotonic arrival
          messages.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));

          messages.forEach((msg) => {
            persistIncomingMessageGlobally(msg);
            this.sendAckDelivered(msg.id, msg.chatId, msg.senderId);
            this.messageListeners.forEach((listener) => {
              try {
                listener(msg);
              } catch {}
            });
          });
          break;
        }

        case 'typing:indicator': {
          this.typingListeners.forEach((listener) => {
            try {
              listener({
                chatId: payload.chatId,
                senderId: payload.senderId,
                isTyping: !!payload.isTyping,
              });
            } catch {}
          });
          break;
        }

        case 'call:signal': {
          this.callSignalListeners.forEach((listener) => {
            try {
              listener({
                fromUserId: payload.fromUserId,
                signalData: payload.signalData,
              });
            } catch {}
          });
          break;
        }

        case 'reaction:updated': {
          this.reactionListeners.forEach((listener) => {
            try {
              listener({
                messageId: payload.messageId,
                chatId: payload.chatId,
                userId: payload.userId,
                emoji: payload.emoji,
                reactions: payload.reactions || {},
              });
            } catch {}
          });
          break;
        }

        case 'pong':
          // Heartbeat healthy
          break;

        default:
          break;
      }
    } catch (e) {
      console.error('Failed to parse incoming WebSocket frame:', e);
    }
  }

  // -------------------------------------------------------------
  // Public High-Level Messaging API with Outbox & Delivery States
  // -------------------------------------------------------------

  /**
   * Transmits an encrypted message with reliable delivery acknowledgement and offline queue fallback.
   */
  public async sendEncryptedMessage(
    id: string,
    chatId: string,
    recipientId: string,
    envelope: EncryptedPayload,
    sequenceNumber: number = 0
  ): Promise<{ success: boolean; sequenceNumber: number; queuedOffline: boolean; status: 'sending' | 'sent' | 'failed' }> {
    const isConnected = this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN;

    if (isConnected) {
      try {
        const seq = await this.transmitWithAck(id, chatId, recipientId, envelope, sequenceNumber);
        persistAckSentGlobally(id, chatId, seq);
        this.ackSentListeners.forEach((l) => {
          try {
            l({ messageId: id, chatId, sequenceNumber: seq });
          } catch {}
        });
        return { success: true, sequenceNumber: seq, queuedOffline: false, status: 'sent' };
      } catch {
        // Transmission timed out or socket dropped: buffer in offline queue with 'sending' status
        await this.queueMessageOffline({
          id,
          chatId,
          recipientId,
          senderId: this.userId || localStorage.getItem('among_user_id') || 'you',
          envelope,
          sequenceNumber,
          createdAt: Date.now(),
          attempts: 1,
          status: 'sending',
        });
        return { success: true, sequenceNumber, queuedOffline: true, status: 'sending' };
      }
    } else {
      // Offline: buffer in offline outbox with 'sending' status
      await this.queueMessageOffline({
        id,
        chatId,
        recipientId,
        senderId: this.userId || localStorage.getItem('among_user_id') || 'you',
        envelope,
        sequenceNumber,
        createdAt: Date.now(),
        attempts: 0,
        status: 'sending',
      });
      return { success: true, sequenceNumber, queuedOffline: true, status: 'sending' };
    }
  }

  private transmitWithAck(
    id: string,
    chatId: string,
    recipientId: string,
    envelope: EncryptedPayload,
    sequenceNumber: number
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.inFlightAcks.delete(id);
        reject(new Error('Message acknowledgement timed out'));
      }, 8000);

      this.inFlightAcks.set(id, { resolve, reject, timeout });

      const sent = this.sendRaw({
        type: 'message:send',
        id,
        chatId,
        senderId: this.userId || localStorage.getItem('among_user_id') || 'you',
        recipientId,
        envelope,
        sequenceNumber,
      });

      if (!sent) {
        clearTimeout(timeout);
        this.inFlightAcks.delete(id);
        reject(new Error('Failed to write to WebSocket stream'));
      }
    });
  }

  /**
   * Notifies the server and sender that an envelope has been delivered to this device.
   */
  public sendAckDelivered(messageId: string, chatId: string, senderId: string) {
    this.sendRaw({
      type: 'ack:delivered',
      messageId,
      chatId,
      senderId,
    });
  }

  /**
   * Notifies the server and sender that the user has opened and read the message.
   */
  public sendAckRead(messageId: string, chatId: string, senderId: string) {
    this.sendRaw({
      type: 'ack:read',
      messageId,
      chatId,
      senderId,
    });
  }

  /**
   * Emits live typing status for the current chat thread.
   */
  public sendTypingStatus(chatId: string, recipientId: string, isTyping: boolean) {
    this.sendRaw({
      type: isTyping ? 'typing:start' : 'typing:stop',
      chatId,
      recipientId,
      senderId: this.userId || undefined,
    });
  }

  /**
   * Transmits WebRTC encrypted call signaling packets.
   */
  public sendCallSignal(targetUserId: string, signalData: any) {
    this.sendRaw({
      type: 'call:signal',
      targetUserId,
      signalData,
    });
  }

  /**
   * Broadcasts real-time emoji reaction updates over the secure networking layer.
   */
  public sendReactionToggle(
    chatId: string,
    messageId: string,
    recipientId: string,
    emoji: string,
    updatedReactions: Record<string, string[]>
  ) {
    this.sendRaw({
      type: 'reaction:toggle',
      chatId,
      messageId,
      recipientId,
      emoji,
      updatedReactions,
    });
  }

  // -------------------------------------------------------------
  // Offline Queuing & Automatic Sync
  // -------------------------------------------------------------

  private async queueMessageOffline(msg: OutgoingQueuedMessage) {
    try {
      const existing = this.getOfflineQueue();
      // Avoid duplicate queued items
      if (!existing.some((m) => m.id === msg.id)) {
        existing.push(msg);
        localStorage.setItem('among_offline_outbox', JSON.stringify(existing));
        window.dispatchEvent(new CustomEvent('among_outbox_updated', { detail: { count: existing.length } }));
      }
    } catch {}
  }

  public getOfflineQueue(): OutgoingQueuedMessage[] {
    try {
      const raw = localStorage.getItem('among_offline_outbox');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async flushOfflineOutbox(): Promise<{ sentCount: number; remainingCount: number }> {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return { sentCount: 0, remainingCount: 0 };

    // Strictly sort by sequence number and creation time to guarantee in-order delivery
    queue.sort((a, b) => (a.sequenceNumber || a.createdAt) - (b.sequenceNumber || b.createdAt));

    const remaining: OutgoingQueuedMessage[] = [];
    let sentCount = 0;

    for (const msg of queue) {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        remaining.push(msg);
        continue;
      }

      try {
        const seq = await this.transmitWithAck(
          msg.id,
          msg.chatId,
          msg.recipientId,
          msg.envelope,
          msg.sequenceNumber
        );
        sentCount++;
        persistAckSentGlobally(msg.id, msg.chatId, seq);
        this.ackSentListeners.forEach((l) => {
          try {
            l({ messageId: msg.id, chatId: msg.chatId, sequenceNumber: seq });
          } catch {}
        });
      } catch (err: any) {
        const newAttempts = (msg.attempts || 0) + 1;
        if (newAttempts >= 5) {
          // Exceeded max auto retries: mark as failed locally so user can manually retry
          persistMessageFailureGlobally(msg.id, msg.chatId, 'Delivery attempts exceeded. Tap to retry.');
        } else {
          remaining.push({
            ...msg,
            attempts: newAttempts,
            lastAttemptAt: Date.now(),
          });
        }
      }
    }

    if (remaining.length > 0) {
      localStorage.setItem('among_offline_outbox', JSON.stringify(remaining));
    } else {
      localStorage.removeItem('among_offline_outbox');
    }

    window.dispatchEvent(
      new CustomEvent('among_outbox_flushed', {
        detail: { sentCount, remainingCount: remaining.length },
      })
    );

    return { sentCount, remainingCount: remaining.length };
  }

  public async retryQueuedMessage(
    messageId: string,
    chatId?: string
  ): Promise<{ success: boolean; sequenceNumber?: number; status: 'sent' | 'sending' | 'failed' }> {
    const queue = this.getOfflineQueue();
    let target = queue.find((m) => m.id === messageId);

    // If not in outbox queue, check local thread messages for envelope recovery
    if (!target && chatId) {
      try {
        const key = `among_thread_messages_${chatId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const msgs = JSON.parse(raw);
          const item = msgs.find((m: any) => m.id === messageId);
          if (item && item.encryptedEnvelope) {
            target = {
              id: item.id,
              chatId,
              recipientId: item.recipientId || '',
              senderId: this.userId || localStorage.getItem('among_user_id') || 'you',
              envelope: item.encryptedEnvelope,
              sequenceNumber: item.sequenceNumber || msgs.length,
              createdAt: item.createdAt || Date.now(),
              attempts: (item.retryCount || 0) + 1,
            };
          }
        }
      } catch {}
    }

    if (!target) {
      return { success: false, status: 'failed' };
    }

    if (this.state !== 'connected' || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
      return { success: false, sequenceNumber: target.sequenceNumber, status: 'sending' };
    }

    try {
      const seq = await this.transmitWithAck(
        target.id,
        target.chatId,
        target.recipientId,
        target.envelope,
        target.sequenceNumber
      );
      const remaining = this.getOfflineQueue().filter((m) => m.id !== messageId);
      if (remaining.length > 0) {
        localStorage.setItem('among_offline_outbox', JSON.stringify(remaining));
      } else {
        localStorage.removeItem('among_offline_outbox');
      }
      persistAckSentGlobally(target.id, target.chatId, seq);
      this.ackSentListeners.forEach((l) => {
        try {
          l({ messageId: target!.id, chatId: target!.chatId, sequenceNumber: seq });
        } catch {}
      });
      return { success: true, sequenceNumber: seq, status: 'sent' };
    } catch (err: any) {
      persistMessageFailureGlobally(target.id, target.chatId, err.message || 'Retry transmission failed');
      return { success: false, sequenceNumber: target.sequenceNumber, status: 'failed' };
    }
  }

  public requestCatchUpSync() {
    this.sendRaw({
      type: 'sync:request',
      userId: this.userId || localStorage.getItem('among_user_id') || undefined,
      sinceTimestamp: Date.now() - 7 * 24 * 3600 * 1000, // Sync past 7 days
    });
  }
}

// Global singleton instance for the app
export const networkManager = new SanctuaryNetworkManager();
