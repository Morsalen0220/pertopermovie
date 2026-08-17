import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

interface User {
  ws: WebSocket;
  peerId: string;
  username: string;
  isHost: boolean;
  roomId: string;
}

interface RoomState {
  id: string;
  users: Map<string, User>;
  videoState: {
    url: string;
    title: string;
    videoType: "sample" | "url" | "local" | "youtube";
    currentTime: number;
    isPlaying: boolean;
    playbackRate: number;
    lastUpdated: number;
    hostName: string;
    youtubeId?: string;
  };
}

const rooms = new Map<string, RoomState>();

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      activeRooms: rooms.size,
      timestamp: Date.now(),
    });
  });

  // Room validation & info
  app.get("/api/rooms/:roomId", (req, res) => {
    const { roomId } = req.params;
    const room = rooms.get(roomId.toUpperCase());
    if (!room) {
      return res.json({ exists: false, count: 0 });
    }
    return res.json({
      exists: true,
      count: room.users.size,
      videoState: room.videoState,
    });
  });

  // WebSocket Server for WebRTC signaling & real-time sync
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    let currentUser: User | null = null;

    ws.on("message", (rawMessage: string) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        const { type, payload } = message;

        switch (type) {
          case "join-room": {
            const { roomId: rawRoomId, peerId, username } = payload;
            const roomId = (rawRoomId || "").trim().toUpperCase();

            if (!roomId || !peerId) return;

            let room = rooms.get(roomId);
            if (!room) {
              room = {
                id: roomId,
                users: new Map(),
                videoState: {
                  url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                  title: "Big Buck Bunny (4K Animation)",
                  videoType: "sample",
                  currentTime: 0,
                  isPlaying: false,
                  playbackRate: 1,
                  lastUpdated: Date.now(),
                  hostName: username || "Host",
                },
              };
              rooms.set(roomId, room);
            }

            // Check max 2 peers (or allow up to 4 if user wants, but optimize for 2)
            const isHost = room.users.size === 0;
            currentUser = {
              ws,
              peerId,
              username: username || `User-${peerId.slice(0, 4)}`,
              isHost,
              roomId,
            };

            room.users.set(peerId, currentUser);

            // Send room joined confirmation with initial state and current peers
            const existingPeers = Array.from(room.users.values())
              .filter((u) => u.peerId !== peerId)
              .map((u) => ({
                peerId: u.peerId,
                username: u.username,
                isHost: u.isHost,
              }));

            ws.send(
              JSON.stringify({
                type: "room-joined",
                payload: {
                  roomId,
                  peerId,
                  isHost,
                  peers: existingPeers,
                  videoState: room.videoState,
                },
              })
            );

            // Notify other peers in the room
            existingPeers.forEach((p) => {
              const target = room?.users.get(p.peerId);
              if (target && target.ws.readyState === WebSocket.OPEN) {
                target.ws.send(
                  JSON.stringify({
                    type: "peer-joined",
                    payload: {
                      peerId: currentUser?.peerId,
                      username: currentUser?.username,
                      isHost: currentUser?.isHost,
                    },
                  })
                );
              }
            });
            break;
          }

          // WebRTC Signaling: SDP Offer/Answer, ICE Candidates
          case "signal": {
            if (!currentUser) return;
            const { targetPeerId, signalData } = payload;
            const room = rooms.get(currentUser.roomId);
            if (!room) return;

            const targetUser = room.users.get(targetPeerId);
            if (targetUser && targetUser.ws.readyState === WebSocket.OPEN) {
              targetUser.ws.send(
                JSON.stringify({
                  type: "signal",
                  payload: {
                    senderPeerId: currentUser.peerId,
                    senderName: currentUser.username,
                    signalData,
                  },
                })
              );
            }
            break;
          }

          // Video Playback Synchronization
          case "sync-video": {
            if (!currentUser) return;
            const room = rooms.get(currentUser.roomId);
            if (!room) return;

            room.videoState = {
              ...room.videoState,
              ...payload.state,
              lastUpdated: Date.now(),
              hostName: currentUser.username,
            };

            // Broadcast to all other peers in the room
            room.users.forEach((user) => {
              if (user.peerId !== currentUser?.peerId && user.ws.readyState === WebSocket.OPEN) {
                user.ws.send(
                  JSON.stringify({
                    type: "video-synced",
                    payload: {
                      state: room.videoState,
                      senderPeerId: currentUser.peerId,
                      senderName: currentUser.username,
                    },
                  })
                );
              }
            });
            break;
          }

          // Real-time Chat
          case "chat-message": {
            if (!currentUser) return;
            const room = rooms.get(currentUser.roomId);
            if (!room) return;

            const chatPayload = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              senderId: currentUser.peerId,
              senderName: currentUser.username,
              text: payload.text,
              timestamp: Date.now(),
            };

            room.users.forEach((user) => {
              if (user.ws.readyState === WebSocket.OPEN) {
                user.ws.send(
                  JSON.stringify({
                    type: "chat-message",
                    payload: chatPayload,
                  })
                );
              }
            });
            break;
          }

          // Live Reactions
          case "reaction": {
            if (!currentUser) return;
            const room = rooms.get(currentUser.roomId);
            if (!room) return;

            const reactionPayload = {
              emoji: payload.emoji,
              senderId: currentUser.peerId,
              senderName: currentUser.username,
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            };

            room.users.forEach((user) => {
              if (user.ws.readyState === WebSocket.OPEN) {
                user.ws.send(
                  JSON.stringify({
                    type: "reaction",
                    payload: reactionPayload,
                  })
                );
              }
            });
            break;
          }

          // Ping-Pong for latency calculation
          case "ping": {
            ws.send(
              JSON.stringify({
                type: "pong",
                payload: { clientTimestamp: payload.timestamp, serverTimestamp: Date.now() },
              })
            );
            break;
          }
        }
      } catch (err) {
        console.error("WebSocket message handling error:", err);
      }
    });

    ws.on("close", () => {
      if (currentUser) {
        const { roomId, peerId } = currentUser;
        const room = rooms.get(roomId);
        if (room) {
          room.users.delete(peerId);
          // Notify remaining users
          room.users.forEach((user) => {
            if (user.ws.readyState === WebSocket.OPEN) {
              user.ws.send(
                JSON.stringify({
                  type: "peer-left",
                  payload: {
                    peerId,
                    username: currentUser?.username,
                  },
                })
              );
            }
          });

          // Clean up empty room
          if (room.users.size === 0) {
            rooms.delete(roomId);
          }
        }
      }
    });
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`P2P Watch Party Server running on http://localhost:${PORT}`);
  });
}

startServer();
