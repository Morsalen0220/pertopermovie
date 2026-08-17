export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  // If it's already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
    return url.trim();
  }

  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// Helper to load YouTube Iframe API once
let ytScriptPromise: Promise<void> | null = null;

export function loadYouTubeIFrameAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if ((window as any).YT && (window as any).YT.Player) {
    return Promise.resolve();
  }

  if (!ytScriptPromise) {
    ytScriptPromise = new Promise((resolve) => {
      const existingScript = document.getElementById("youtube-iframe-api");
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const prevCallback = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        resolve();
      };

      // Fallback check if already loaded
      const checkInterval = setInterval(() => {
        if ((window as any).YT && (window as any).YT.Player) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  return ytScriptPromise;
}
