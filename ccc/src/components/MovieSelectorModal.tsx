import React, { useState } from "react";
import {
  X,
  Link,
  Upload,
  Play,
  Sparkles,
  Check,
  Youtube,
  Tv
} from "lucide-react";
import { SAMPLE_MOVIES, YOUTUBE_SAMPLE_VIDEOS, YouTubeSample } from "../data/movies";
import { SampleMovie, VideoState, Language } from "../types";
import { TRANSLATIONS } from "../utils/translations";
import { extractYouTubeId } from "../utils/youtube";

interface MovieSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie: (movieState: Partial<VideoState>) => void;
  currentUrl: string;
  language: Language;
}

export const MovieSelectorModal: React.FC<MovieSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectMovie,
  currentUrl,
  language,
}) => {
  const t = TRANSLATIONS[language];
  const [activeTab, setActiveTab] = useState<"youtube" | "catalog" | "custom" | "local">("youtube");
  const [youtubeUrlInput, setYoutubeUrlInput] = useState<string>("");
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState<string>("");
  const [customTitleInput, setCustomTitleInput] = useState<string>("");
  const [localFileName, setLocalFileName] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectSample = (movie: SampleMovie) => {
    onSelectMovie({
      url: movie.url,
      title: movie.title,
      videoType: "sample",
      currentTime: 0,
      isPlaying: true,
    });
    onClose();
  };

  const handleSelectYouTubeSample = (ytMovie: YouTubeSample) => {
    onSelectMovie({
      url: ytMovie.url,
      title: ytMovie.title,
      videoType: "youtube",
      youtubeId: ytMovie.youtubeId,
      currentTime: 0,
      isPlaying: true,
    });
    onClose();
  };

  const handleYouTubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setYoutubeError(null);
    const videoId = extractYouTubeId(youtubeUrlInput.trim());

    if (!videoId) {
      setYoutubeError(t.invalidYoutubeUrl);
      return;
    }

    onSelectMovie({
      url: youtubeUrlInput.trim().startsWith("http") ? youtubeUrlInput.trim() : `https://www.youtube.com/watch?v=${videoId}`,
      title: `YouTube: ${videoId}`,
      videoType: "youtube",
      youtubeId: videoId,
      currentTime: 0,
      isPlaying: true,
    });
    setYoutubeUrlInput("");
    onClose();
  };

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;

    const trimmed = customUrlInput.trim();
    const ytId = extractYouTubeId(trimmed);

    if (ytId) {
      onSelectMovie({
        url: trimmed,
        title: customTitleInput.trim() || `YouTube: ${ytId}`,
        videoType: "youtube",
        youtubeId: ytId,
        currentTime: 0,
        isPlaying: true,
      });
    } else {
      onSelectMovie({
        url: trimmed,
        title: customTitleInput.trim() || "Custom Video Stream",
        videoType: "url",
        currentTime: 0,
        isPlaying: true,
      });
    }
    onClose();
  };

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    setLocalFileName(file.name);

    onSelectMovie({
      url: fileUrl,
      title: file.name.replace(/\.[^/.]+$/, ""),
      videoType: "local",
      currentTime: 0,
      isPlaying: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        id="movie-selector-modal"
        className="relative w-full max-w-3xl bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <Tv className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">
              {t.selectMovie}
            </h3>
          </div>
          <button
            id="close-movie-modal-btn"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 px-5 bg-neutral-950/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab("youtube")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeTab === "youtube"
                ? "border-red-500 text-red-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Youtube className="w-4 h-4 text-red-500" />
            <span>{t.youtubeTab}</span>
          </button>
          <button
            onClick={() => setActiveTab("catalog")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeTab === "catalog"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{language === "bn" ? "মুভিজ" : "Movies"}</span>
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeTab === "custom"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Link className="w-4 h-4 text-emerald-400" />
            <span>{t.customUrl}</span>
          </button>
          <button
            onClick={() => setActiveTab("local")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeTab === "local"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>{t.localFile}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* 1. YouTube Tab */}
          {activeTab === "youtube" && (
            <div className="space-y-4">
              <form onSubmit={handleYouTubeSubmit} className="bg-neutral-950 p-3.5 rounded-xl border border-white/10">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder={t.youtubePlaceholder}
                    value={youtubeUrlInput}
                    onChange={(e) => {
                      setYoutubeUrlInput(e.target.value);
                      if (youtubeError) setYoutubeError(null);
                    }}
                    className="flex-1 px-3.5 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{t.playYoutubeBtn}</span>
                  </button>
                </div>

                {youtubeError && (
                  <p className="text-xs text-red-400 mt-2 font-medium">
                    {youtubeError}
                  </p>
                )}
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {YOUTUBE_SAMPLE_VIDEOS.map((yt) => {
                  const isCurrent = currentUrl.includes(yt.youtubeId);
                  return (
                    <div
                      key={yt.id}
                      onClick={() => handleSelectYouTubeSample(yt)}
                      className={`group relative rounded-xl overflow-hidden bg-neutral-950 border transition-all hover:scale-[1.02] cursor-pointer flex flex-col ${
                        isCurrent
                          ? "border-red-500 ring-2 ring-red-500/30"
                          : "border-white/10 hover:border-red-500/40"
                      }`}
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-neutral-800">
                        <img
                          src={yt.poster}
                          alt={yt.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white font-mono">
                          {yt.duration}
                        </span>
                      </div>

                      <div className="p-2.5 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <h4 className="text-xs font-semibold text-white truncate group-hover:text-red-400 transition">
                            {yt.title}
                          </h4>
                          <span className="text-[10px] text-neutral-400">{yt.genre}</span>
                        </div>
                        {isCurrent ? (
                          <Check className="w-4 h-4 text-red-400 shrink-0" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Catalog Tab */}
          {activeTab === "catalog" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {SAMPLE_MOVIES.map((movie) => {
                const isCurrent = currentUrl === movie.url;
                return (
                  <div
                    key={movie.id}
                    onClick={() => handleSelectSample(movie)}
                    className={`group relative rounded-xl overflow-hidden bg-neutral-950 border transition-all hover:scale-[1.02] cursor-pointer flex flex-col ${
                      isCurrent
                        ? "border-emerald-500 ring-2 ring-emerald-500/30"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-neutral-800">
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white font-mono">
                        {movie.duration}
                      </span>
                    </div>

                    <div className="p-2.5 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <h4 className="text-xs font-semibold text-white truncate group-hover:text-emerald-400 transition">
                          {movie.title}
                        </h4>
                        <span className="text-[10px] text-neutral-400">{movie.genre}</span>
                      </div>
                      {isCurrent ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Custom Video URL Tab */}
          {activeTab === "custom" && (
            <form onSubmit={handleCustomUrlSubmit} className="space-y-3 max-w-md mx-auto py-2">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  {language === "bn" ? "ভিডিও বা ইউটিউব লিংক" : "Video URL / Stream Link"}
                </label>
                <input
                  type="url"
                  placeholder="https://... or YouTube Link"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  {language === "bn" ? "শিরোনাম (ঐচ্ছিক)" : "Title (Optional)"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Video"
                  value={customTitleInput}
                  onChange={(e) => setCustomTitleInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer shadow"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{language === "bn" ? "প্লে করুন" : "Play"}</span>
              </button>
            </form>
          )}

          {/* 4. Local File Tab */}
          {activeTab === "local" && (
            <div className="max-w-md mx-auto py-4 text-center space-y-3">
              <div className="border border-dashed border-white/20 rounded-2xl p-6 hover:border-emerald-500/50 transition flex flex-col items-center justify-center bg-neutral-950">
                <Upload className="w-8 h-8 text-emerald-400 mb-2" />
                <h4 className="text-xs font-medium text-white">
                  {language === "bn"
                    ? "ডিভাইস থেকে ফাইল নির্বাচন করুন"
                    : "Select video from your device"}
                </h4>

                <label className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl cursor-pointer transition flex items-center space-x-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{language === "bn" ? "ফাইল খুঁজুন" : "Browse File"}</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleLocalFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {localFileName && (
                <div className="p-2 bg-neutral-950 rounded-lg border border-white/10 text-xs text-emerald-400">
                  Selected: {localFileName}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
