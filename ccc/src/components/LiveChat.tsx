import React, { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Smile, Sparkles } from "lucide-react";
import { ChatMessage, Language } from "../types";
import { TRANSLATIONS } from "../utils/translations";

interface LiveChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onTriggerReaction: (emoji: string) => void;
  myPeerId: string;
  language: Language;
}

const QUICK_EMOJIS = ["🍿", "❤️", "😂", "🔥", "😭", "👏", "🎬", "✨"];

export const LiveChat: React.FC<LiveChatProps> = ({
  messages,
  onSendMessage,
  onTriggerReaction,
  myPeerId,
  language,
}) => {
  const t = TRANSLATIONS[language];
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900/90 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-neutral-950/40">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
            {language === "bn" ? "লাইভ চ্যাট" : "Live Chat"}
          </h3>
        </div>
        <span className="text-[11px] text-neutral-400 bg-white/5 px-2 py-0.5 rounded-full">
          {messages.length} {language === "bn" ? "মেসেজ" : "msgs"}
        </span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 min-h-[140px] max-h-[360px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-neutral-500 space-y-1">
            <Smile className="w-6 h-6 text-neutral-600" />
            <p className="text-xs">
              {language === "bn"
                ? "সিনেমা দেখতে দেখতে লাইভ চ্যাট করুন!"
                : "Chat and share reactions while watching together!"}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSystem = msg.senderId === "system";
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-1.5">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] px-3 py-1 rounded-full text-center font-medium shadow-sm">
                    {msg.text}
                  </div>
                </div>
              );
            }

            const isMe = msg.senderId === myPeerId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isMe ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1 px-1">
                  <span className="text-[11px] font-medium text-neutral-400">
                    {isMe ? `${msg.senderName} (You)` : msg.senderName}
                  </span>
                  <span className="text-[10px] text-neutral-600 font-mono">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl text-xs max-w-[85%] break-words shadow-sm ${
                    isMe
                      ? "bg-emerald-600 text-white rounded-tr-none"
                      : "bg-neutral-800 text-neutral-200 border border-white/5 rounded-tl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Reaction Bar */}
      <div className="px-3 py-1.5 bg-neutral-950/60 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center space-x-1 overflow-x-auto py-0.5">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onTriggerReaction(emoji)}
              className="p-1 hover:bg-white/10 rounded-md transition hover:scale-125 active:scale-95 text-base cursor-pointer"
              title={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSubmit}
        className="p-2.5 bg-neutral-950 border-t border-white/10 flex items-center space-x-2"
      >
        <input
          id="chat-message-input"
          type="text"
          placeholder={t.chatPlaceholder}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          id="send-chat-btn"
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl transition cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
