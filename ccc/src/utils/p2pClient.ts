import Peer, { DataConnection } from "peerjs";
import { VideoState, PeerInfo, ChatMessage, FloatingReaction } from "../types";

export interface P2PMessage {
  type:
    | "join-room"
    | "room-joined"
    | "peer-joined"
    | "peer-left"
    | "sync-video"
    | "video-synced"
    | "chat-message"
    | "reaction";
  payload: any;
}

export type MessageHandler = (message: P2PMessage) => void;

export class P2PClient {
  private peer: Peer | null = null;
  private isHost: boolean = false;
  private roomId: string = "";
  private myPeerId: string = "";
  private myUsername: string = "";
  private hostConn: DataConnection | null = null;
  private guestConns: Map<string, { conn: DataConnection; username: string }> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;
  private onMessageCallback: MessageHandler;

  private chatHistory: ChatMessage[] = [];

  private currentVideoState: VideoState = {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    title: "Big Buck Bunny (4K Animation)",
    videoType: "sample",
    currentTime: 0,
    isPlaying: false,
    playbackRate: 1,
    lastUpdated: Date.now(),
    hostName: "Host",
  };

  constructor(
    roomId: string,
    myPeerId: string,
    myUsername: string,
    isHost: boolean,
    onMessage: MessageHandler
  ) {
    this.roomId = roomId.toUpperCase().trim();
    this.myPeerId = myPeerId;
    this.myUsername = myUsername;
    this.isHost = isHost;
    this.onMessageCallback = onMessage;
  }

  public init() {
    // 1. Setup local BroadcastChannel for multi-tab sync
    try {
      this.broadcastChannel = new BroadcastChannel(`syncwatch_room_${this.roomId}`);
      this.broadcastChannel.onmessage = (event) => {
        if (event.data && event.data.senderId !== this.myPeerId) {
          this.handleIncomingMessage(event.data.message);
        }
      };
    } catch (e) {
      console.warn("BroadcastChannel not supported in this browser environment.", e);
    }

    // 2. Setup PeerJS
    const hostPeerId = `syncwatch-v1-${this.roomId}-host`;
    const clientPeerId = this.isHost
      ? hostPeerId
      : `syncwatch-v1-${this.roomId}-guest-${Math.random().toString(36).substring(2, 7)}`;

    this.peer = new Peer(clientPeerId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      },
    });

    this.peer.on("open", (id) => {
      console.log("P2P Client initialized with Peer ID:", id);

      if (this.isHost) {
        // Host ready
        this.onMessageCallback({
          type: "room-joined",
          payload: {
            isHost: true,
            peers: [],
            videoState: this.currentVideoState,
            chatHistory: this.chatHistory,
          },
        });
      } else {
        // Guest connects to Host
        this.connectToHost(hostPeerId);
      }
    });

    this.peer.on("connection", (conn) => {
      if (this.isHost) {
        this.handleGuestConnection(conn);
      }
    });

    this.peer.on("error", (err) => {
      console.warn("PeerJS error:", err.type, err.message);
      if (err.type === "unavailable-id" && this.isHost) {
        // If host ID unavailable, try joining as guest
        console.log("Host ID taken, switching to guest mode...");
        this.isHost = false;
        this.connectToHost(hostPeerId);
      }
    });
  }

  private connectToHost(hostPeerId: string) {
    if (!this.peer) return;

    const conn = this.peer.connect(hostPeerId, { reliable: true });
    this.hostConn = conn;

    conn.on("open", () => {
      console.log("Connected to Host P2P connection successfully!");
      const joinMsg: P2PMessage = {
        type: "join-room",
        payload: {
          roomId: this.roomId,
          peerId: this.myPeerId,
          username: this.myUsername,
        },
      };
      conn.send(joinMsg);
    });

    conn.on("data", (data: any) => {
      this.handleIncomingMessage(data as P2PMessage);
    });

    conn.on("close", () => {
      console.log("Host connection closed.");
    });
  }

  private handleGuestConnection(conn: DataConnection) {
    let guestPeerId = "";
    let guestUsername = "";

    conn.on("data", (data: any) => {
      const msg = data as P2PMessage;

      if (msg.type === "join-room") {
        guestPeerId = msg.payload.peerId;
        guestUsername = msg.payload.username || "Guest";

        this.guestConns.set(guestPeerId, { conn, username: guestUsername });

        // Send current room state & peer list back to new guest
        const peersList: PeerInfo[] = Array.from(this.guestConns.entries()).map(
          ([pId, val]) => ({
            peerId: pId,
            username: val.username,
            isHost: false,
          })
        );

        conn.send({
          type: "room-joined",
          payload: {
            isHost: false,
            peers: [
              ...peersList.filter((p) => p.peerId !== guestPeerId),
              { peerId: this.myPeerId, username: this.myUsername, isHost: true },
            ],
            videoState: this.currentVideoState,
            chatHistory: this.chatHistory,
          },
        });

        // Notify other peers about new peer
        const peerJoinedMsg: P2PMessage = {
          type: "peer-joined",
          payload: {
            peerId: guestPeerId,
            username: guestUsername,
            isHost: false,
          },
        };
        this.broadcastToGuests(peerJoinedMsg, guestPeerId);

        // Notify host UI
        this.onMessageCallback(peerJoinedMsg);
      } else {
        // Forward message to host UI and all other guests
        this.handleIncomingMessage(msg);
        this.broadcastToGuests(msg, guestPeerId);
      }
    });

    conn.on("close", () => {
      if (guestPeerId) {
        this.guestConns.delete(guestPeerId);
        const peerLeftMsg: P2PMessage = {
          type: "peer-left",
          payload: { peerId: guestPeerId, username: guestUsername },
        };
        this.broadcastToGuests(peerLeftMsg);
        this.onMessageCallback(peerLeftMsg);
      }
    });
  }

  private handleIncomingMessage(msg: P2PMessage) {
    if (msg.type === "sync-video" || msg.type === "video-synced") {
      this.currentVideoState = { ...this.currentVideoState, ...msg.payload.state };
    } else if (msg.type === "chat-message") {
      if (!this.chatHistory.some((m) => m.id === msg.payload.id)) {
        this.chatHistory.push(msg.payload);
      }
    }
    this.onMessageCallback(msg);
  }

  private broadcastToGuests(msg: P2PMessage, excludePeerId?: string) {
    this.guestConns.forEach(({ conn }, pId) => {
      if (pId !== excludePeerId && conn.open) {
        try {
          conn.send(msg);
        } catch (e) {
          console.warn("Failed sending msg to peer:", pId, e);
        }
      }
    });
  }

  public sendMessage(msg: P2PMessage) {
    // 1. Broadcast locally to same-origin tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          senderId: this.myPeerId,
          message: msg,
        });
      } catch (e) {}
    }

    // 2. If Host: broadcast to all connected guests
    if (this.isHost) {
      this.broadcastToGuests(msg);
    } else if (this.hostConn && this.hostConn.open) {
      // If Guest: send to Host
      try {
        this.hostConn.send(msg);
      } catch (e) {
        console.warn("Failed sending to host connection", e);
      }
    }
  }

  public updateVideoState(state: Partial<VideoState>) {
    this.currentVideoState = { ...this.currentVideoState, ...state, lastUpdated: Date.now() };
    const msg: P2PMessage = {
      type: "video-synced",
      payload: { state: this.currentVideoState },
    };
    this.sendMessage(msg);
  }

  public sendChatMessage(text: string): ChatMessage {
    const chatMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: this.myPeerId,
      senderName: this.myUsername,
      text,
      timestamp: Date.now(),
    };

    const msg: P2PMessage = {
      type: "chat-message",
      payload: chatMsg,
    };
    this.sendMessage(msg);
    return chatMsg;
  }

  public sendReaction(emoji: string): FloatingReaction {
    const reaction: FloatingReaction = {
      id: `react-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      emoji,
      senderName: this.myUsername,
      xOffset: Math.floor(Math.random() * 70) + 15,
    };

    const msg: P2PMessage = {
      type: "reaction",
      payload: reaction,
    };
    this.sendMessage(msg);
    return reaction;
  }

  public destroy() {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch (e) {}
    }

    if (this.hostConn) {
      try {
        this.hostConn.close();
      } catch (e) {}
    }

    this.guestConns.forEach(({ conn }) => {
      try {
        conn.close();
      } catch (e) {}
    });
    this.guestConns.clear();

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
  }
}
