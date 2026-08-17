import React, { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import {
  Film,
  Users,
  Copy,
  Check,
  LogOut,
  Globe,
  Radio,
} from "lucide-react";
import { PeerInfo, VideoState, ChatMessage, FloatingReaction, Language } from "../types";
import { SyncedPlayer } from "./SyncedPlayer";
import { LiveChat } from "./LiveChat";
import { MovieSelectorModal } from "./MovieSelectorModal";
import { TRANSLATIONS } from "../utils/translations";
import { P2PClient, P2PMessage } from "../utils/p2pClient";

interface WatchPartyRoomProps {
  roomId: string;
  myPeerId: string;
  myUsername: string;
  isHost: boolean;
  onLeaveRoom: () => void;
  language: Language;
  onToggleLanguage: () => void;
}

export const WatchPartyRoom: React.FC<WatchPartyRoomProps> = ({
  roomId,
  myPeerId,
  myUsername,
  isHost: initialIsHost,
  onLeaveRoom,
  language,
  onToggleLanguage,
}) => {
  const t = TRANSLATIONS[language];
  const [isHost, setIsHost] = useState<boolean>(initialIsHost);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isMovieSelectorOpen, setIsMovieSelectorOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(`syncwatch_chat_${roomId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save chat to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(`syncwatch_chat_${roomId}`, JSON.stringify(chatMessages));
    } catch {}
  }, [chatMessages, roomId]);

  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  // Video state (Synced across peers)
  const [videoState, setVideoState] = useState<VideoState>({
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    title: "Big Buck Bunny (4K Animation)",
    videoType: "sample",
    currentTime: 0,
    isPlaying: false,
    playbackRate: 1,
    lastUpdated: Date.now(),
    hostName: myUsername,
  });

  const p2pClientRef = useRef<P2PClient | null>(null);

  // Client P2P Connection
  useEffect(() => {
    const p2p = new P2PClient(
      roomId,
      myPeerId,
      myUsername,
      initialIsHost,
      (message: P2PMessage) => {
        const { type, payload } = message;

        switch (type) {
          case "room-joined": {
            setIsHost(payload.isHost);
            setPeers(payload.peers || []);
            if (payload.videoState) {
              setVideoState(payload.videoState);
            }
            if (payload.chatHistory && Array.isArray(payload.chatHistory) && payload.chatHistory.length > 0) {
              setChatMessages((prev) => {
                const map = new Map<string, ChatMessage>();
                prev.forEach((m) => map.set(m.id, m));
                payload.chatHistory.forEach((m: ChatMessage) => map.set(m.id, m));
                return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
              });
            }
            break;
          }

          case "peer-joined": {
            setPeers((prev) => {
              const exists = prev.some((p) => p.peerId === payload.peerId);
              if (exists) return prev;
              return [...prev, payload];
            });

            // Trigger celebration confetti when partner joins!
            try {
              confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.8 },
              });
            } catch {}

            // Send welcoming chat notification
            setChatMessages((prev) => [
              ...prev,
              {
                id: `system-${Date.now()}`,
                senderId: "system",
                senderName: "System",
                text: `${payload.username} ${language === "bn" ? "রুমে যোগ দিয়েছেন! একসাথে ভিডিও উপভোগ করুন।" : "joined the watch party!"}`,
                timestamp: Date.now(),
              },
            ]);
            break;
          }

          case "peer-left": {
            setPeers((prev) => prev.filter((p) => p.peerId !== payload.peerId));
            setChatMessages((prev) => [
              ...prev,
              {
                id: `system-${Date.now()}`,
                senderId: "system",
                senderName: "System",
                text: `${payload.username || "Friend"} ${language === "bn" ? "রুম ত্যাগ করেছেন।" : "left the room."}`,
                timestamp: Date.now(),
              },
            ]);
            break;
          }

          case "video-synced": {
            setVideoState((prev) => ({
              ...prev,
              ...payload.state,
              lastUpdated: Date.now(),
            }));
            break;
          }

          case "chat-message": {
            setChatMessages((prev) => {
              if (prev.some((m) => m.id === payload.id)) return prev;
              return [...prev, payload];
            });
            break;
          }

          case "reaction": {
            const newReaction: FloatingReaction = {
              id: payload.id,
              emoji: payload.emoji,
              senderName: payload.senderName,
              xOffset: Math.floor(Math.random() * 70) + 15,
            };
            setFloatingReactions((prev) => [...prev, newReaction]);

            // Auto clean reaction after 3.5 seconds
            setTimeout(() => {
              setFloatingReactions((prev) =>
                prev.filter((r) => r.id !== newReaction.id)
              );
            }, 3500);
            break;
          }
        }
      }
    );

    p2p.init();
    p2pClientRef.current = p2p;

    return () => {
      p2p.destroy();
    };
  }, [roomId, myPeerId, myUsername, initialIsHost, language]);

  // Video State Update dispatcher
  const handleUpdateVideoState = useCallback((newState: Partial<VideoState>) => {
    setVideoState((prev) => {
      const merged = { ...prev, ...newState, lastUpdated: Date.now() };
      if (p2pClientRef.current) {
        p2pClientRef.current.updateVideoState(newState);
      }
      return merged;
    });
  }, []);

  // Send Live Chat Message
  const handleSendMessage = useCallback((text: string) => {
    if (p2pClientRef.current) {
      const chatMsg = p2pClientRef.current.sendChatMessage(text);
      setChatMessages((prev) => [...prev, chatMsg]);
    }
  }, []);

  // Send Floating Emoji Reaction
  const handleTriggerReaction = useCallback((emoji: string) => {
    if (p2pClientRef.current) {
      const reaction = p2pClientRef.current.sendReaction(emoji);
      setFloatingReactions((prev) => [...prev, reaction]);

      setTimeout(() => {
        setFloatingReactions((prev) =>
          prev.filter((r) => r.id !== reaction.id)
        );
      }, 3500);
    }
  }, []);

  // Copy Room Link / Invite Code
  const handleCopyRoomLink = () => {
    const inviteUrl = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col h-screen overflow-hidden">
      {/* Top Bar Navigation */}
      <header className="h-14 border-b border-white/10 bg-neutral-900/80 backdrop-blur-md px-4 flex items-center justify-between flex-shrink-0 z-30">
        {/* Left: Brand & Room ID */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-900">
              <Film className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">
              {t.appName}
            </span>
          </div>

          <div className="h-4 w-px bg-white/20 hidden sm:block" />

          {/* Room Pill */}
          <div className="flex items-center space-x-2 bg-neutral-950 px-3 py-1 rounded-xl border border-white/10 text-xs">
            <span className="text-neutral-400 font-mono">
              {t.roomCode}: <strong className="text-emerald-400 font-bold tracking-wider">{roomId}</strong>
            </span>
            <button
              id="header-copy-link-btn"
              onClick={handleCopyRoomLink}
              className="p-1 hover:bg-white/10 rounded-md text-neutral-300 hover:text-emerald-400 transition cursor-pointer"
              title={t.copyInvite}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Active Peers Counter */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Users className="w-3.5 h-3.5 text-emerald-400 ml-1" />
            <span>
              {peers.length + 1} {language === "bn" ? "জন দর্শক" : "Watching"}
            </span>
          </div>
        </div>

        {/* Right: Language & Leave */}
        <div className="flex items-center space-x-2">
          {/* Language Switch */}
          <button
            onClick={onToggleLanguage}
            className="px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer text-xs flex items-center space-x-1.5 border border-white/10"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === "en" ? "বাংলা" : "English"}</span>
          </button>

          {/* Leave Room Button */}
          <button
            id="leave-room-btn"
            onClick={onLeaveRoom}
            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium rounded-xl border border-rose-500/30 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.leaveRoom}</span>
          </button>
        </div>
      </header>

      {/* Main Watch Party Grid: Synced Player on Left + Live Chat & Room details on Right */}
      <main className="flex-1 p-3 sm:p-4 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 h-full">
          {/* Primary Video / Movie Player Stage (9 Cols on large screen) */}
          <div className="lg:col-span-8 xl:col-span-9 h-full flex flex-col min-h-0">
            <SyncedPlayer
              videoState={videoState}
              onUpdateVideoState={handleUpdateVideoState}
              floatingReactions={floatingReactions}
              onTriggerReaction={handleTriggerReaction}
              language={language}
              onOpenMovieSelector={() => setIsMovieSelectorOpen(true)}
              isHost={isHost}
            />
          </div>

          {/* Right Side Column: Live Chat & Room Info (3-4 Cols) */}
          <div className="lg:col-span-4 xl:col-span-3 h-full flex flex-col space-y-3 overflow-hidden min-h-0">
            {/* Connected Watchers Card */}
            <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-3.5 flex flex-col space-y-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 mr-1.5 animate-pulse" />
                  {t.connectedPeers}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30">
                  {peers.length === 0 ? (language === "bn" ? "১ জন অনলাইন" : "1 Online") : (language === "bn" ? "২ জন সংযুক্ত" : "2 Connected")}
                </span>
              </div>

              {/* Users list */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs bg-neutral-950/70 p-2 rounded-xl border border-white/5">
                  <span className="font-medium text-white flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                    {myUsername} (You)
                  </span>
                  <span className="text-[10px] bg-emerald-600/30 text-emerald-300 px-1.5 py-0.5 rounded">
                    {isHost ? t.hostBadge : t.guestBadge}
                  </span>
                </div>

                {peers.map((peer) => (
                  <div
                    key={peer.peerId}
                    className="flex items-center justify-between text-xs bg-neutral-950/70 p-2 rounded-xl border border-white/5"
                  >
                    <span className="font-medium text-white flex items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                      {peer.username}
                    </span>
                    <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded">
                      {peer.isHost ? t.hostBadge : t.guestBadge}
                    </span>
                  </div>
                ))}

                {peers.length === 0 && (
                  <div className="p-2.5 bg-neutral-950/50 rounded-xl border border-dashed border-white/10 text-center">
                    <p className="text-[11px] text-neutral-400 mb-1.5">
                      {t.waitingForPeer}
                    </p>
                    <button
                      onClick={handleCopyRoomLink}
                      className="text-xs text-emerald-400 hover:underline font-medium flex items-center justify-center mx-auto space-x-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedLink ? t.copied : t.copyInvite}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Real-time Text Chat */}
            <div className="flex-1 min-h-0">
              <LiveChat
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                onTriggerReaction={handleTriggerReaction}
                myPeerId={myPeerId}
                language={language}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Movie Selection / YouTube / URL Modal */}
      <MovieSelectorModal
        isOpen={isMovieSelectorOpen}
        onClose={() => setIsMovieSelectorOpen(false)}
        onSelectMovie={handleUpdateVideoState}
        currentUrl={videoState.url}
        language={language}
      />
    </div>
  );
};
