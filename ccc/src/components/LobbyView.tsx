import React, { useState, useEffect } from "react";
import {
  Film,
  Users,
  Play,
  Copy,
  Check,
  Globe,
  Radio,
  ArrowRight,
  Tv,
  Youtube,
} from "lucide-react";
import { SAMPLE_MOVIES, YOUTUBE_SAMPLE_VIDEOS } from "../data/movies";
import { Language } from "../types";
import { TRANSLATIONS } from "../utils/translations";

interface LobbyViewProps {
  onJoinRoom: (roomId: string, username: string, isCreating: boolean) => void;
  language: Language;
  onToggleLanguage: () => void;
  initialRoomIdFromUrl?: string;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  onJoinRoom,
  language,
  onToggleLanguage,
  initialRoomIdFromUrl,
}) => {
  const t = TRANSLATIONS[language];
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem("syncwatch_username") || "";
  });
  const [joinRoomCode, setJoinRoomCode] = useState<string>(initialRoomIdFromUrl || "");
  const [activeMode, setActiveMode] = useState<"create" | "join">(
    initialRoomIdFromUrl ? "join" : "create"
  );
  const [generatedRoomCode, setGeneratedRoomCode] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState(false);

  const generateNewRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let res = "";
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  useEffect(() => {
    if (!generatedRoomCode) {
      setGeneratedRoomCode(generateNewRoomCode());
    }
  }, [generatedRoomCode]);

  const handleStartHosting = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = username.trim() || (language === "bn" ? "হোস্ট" : "Host");
    localStorage.setItem("syncwatch_username", finalName);
    onJoinRoom(generatedRoomCode, finalName, true);
  };

  const handleJoinExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomCode.trim()) return;
    const finalName = username.trim() || (language === "bn" ? "দর্শক" : "Guest");
    localStorage.setItem("syncwatch_username", finalName);
    onJoinRoom(joinRoomCode.trim().toUpperCase(), finalName, false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedRoomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/10 bg-neutral-950/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-950">
              <Film className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">
              {t.appName}
            </span>
          </div>

          <button
            id="language-toggle-btn"
            onClick={onToggleLanguage}
            className="px-3 py-1 text-xs text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === "en" ? "বাংলা" : "English"}</span>
          </button>
        </div>
      </header>

      {/* Centered Minimalist Card Container */}
      <main className="max-w-xl w-full mx-auto px-4 py-8 flex-1 flex flex-col justify-center items-center z-10">
        {/* Title Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>{language === "bn" ? "ইউটিউব ও মুভি লাইভ সিঙ্ক" : "YouTube & Movie Live Sync"}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t.tagline}
          </h1>
        </div>

        {/* The Main Action Card */}
        <div
          id="lobby-card"
          className="w-full bg-neutral-900/90 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl"
        >
          {/* Segmented Mode Selector */}
          <div className="flex bg-neutral-950 p-1 rounded-xl border border-white/10 mb-5">
            <button
              id="tab-create-room"
              onClick={() => setActiveMode("create")}
              className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center space-x-2 ${
                activeMode === "create"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>{t.createRoom}</span>
            </button>
            <button
              id="tab-join-room"
              onClick={() => setActiveMode("join")}
              className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center space-x-2 ${
                activeMode === "join"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{t.joinRoom}</span>
            </button>
          </div>

          {/* 1. Host Room Form */}
          {activeMode === "create" && (
            <form onSubmit={handleStartHosting} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  {t.yourName}
                </label>
                <input
                  id="host-username-input"
                  type="text"
                  placeholder={t.enterNamePlaceholder}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-white/10 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              {/* Room Code Badge */}
              <div className="bg-neutral-950 p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-mono">
                    {t.roomCode}
                  </span>
                  <span className="font-mono text-xl font-bold text-emerald-400 tracking-wider">
                    {generatedRoomCode}
                  </span>
                </div>
                <button
                  type="button"
                  id="copy-room-code-btn"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-neutral-200 text-xs rounded-lg border border-white/10 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{t.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t.copyInvite}</span>
                    </>
                  )}
                </button>
              </div>

              <button
                id="submit-create-room-btn"
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-emerald-950"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{t.createButton}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* 2. Join Room Form */}
          {activeMode === "join" && (
            <form onSubmit={handleJoinExisting} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  {t.yourName}
                </label>
                <input
                  id="join-username-input"
                  type="text"
                  placeholder={t.enterNamePlaceholder}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-white/10 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  {t.enterRoomId}
                </label>
                <input
                  id="join-room-code-input"
                  type="text"
                  placeholder="e.g. A3F8K9"
                  maxLength={8}
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-white/10 rounded-xl text-base font-mono tracking-widest text-emerald-400 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 uppercase transition"
                  required
                />
              </div>

              <button
                id="submit-join-room-btn"
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-emerald-950"
              >
                <Users className="w-4 h-4" />
                <span>{t.joinButton}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Quick Preview Chips (Clean Minimalist) */}
        <div className="w-full mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              {language === "bn" ? "সরাসরি দেখার ভিডিও:" : "Ready to watch:"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {YOUTUBE_SAMPLE_VIDEOS.slice(0, 2).map((yt) => (
              <div
                key={yt.id}
                className="flex items-center space-x-2 bg-neutral-900/60 border border-white/5 px-2.5 py-1.5 rounded-lg text-xs text-neutral-300"
              >
                <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="truncate max-w-[150px]">{yt.title}</span>
              </div>
            ))}
            {SAMPLE_MOVIES.slice(0, 2).map((m) => (
              <div
                key={m.id}
                className="flex items-center space-x-2 bg-neutral-900/60 border border-white/5 px-2.5 py-1.5 rounded-lg text-xs text-neutral-300"
              >
                <Film className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate max-w-[150px]">{m.title}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-3 text-center text-xs text-neutral-500">
        SyncWatch • Real-Time YouTube & Movie Sync
      </footer>
    </div>
  );
};
