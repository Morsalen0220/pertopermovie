import { SampleMovie } from "../types";

export const SAMPLE_MOVIES: SampleMovie[] = [
  {
    id: "big-buck-bunny",
    title: "Big Buck Bunny",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
    duration: "9:56",
    genre: "Animation / Comedy",
    description: "A large and lovable rabbit takes revenge on bullying forest creatures in this iconic open-source animation masterpiece.",
    language: "English / Universal"
  },
  {
    id: "tears-of-steel",
    title: "Tears of Steel",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
    duration: "12:14",
    genre: "Sci-Fi / Action VFX",
    description: "Set in a dystopian future Amsterdam, a group of warriors and scientists try to save the world from destructive cyborg robots.",
    language: "English"
  },
  {
    id: "sintel",
    title: "Sintel (Dragon Fantasy)",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    poster: "https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?w=800&auto=format&fit=crop&q=80",
    duration: "14:48",
    genre: "Fantasy / Drama",
    description: "A lonely young woman searches the world for a baby dragon companion she nursed back to health, with an unforgettable ending.",
    language: "English"
  },
  {
    id: "elephants-dream",
    title: "Elephants Dream",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    poster: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80",
    duration: "10:53",
    genre: "Sci-Fi / Surreal",
    description: "Two strange men explore the giant, mechanical, and surreal inner machinery of an infinite sentient labyrinth.",
    language: "English"
  },
  {
    id: "for-bigger-blazes",
    title: "For Bigger Blazes",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    poster: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80",
    duration: "0:15",
    genre: "Action / High Dynamic",
    description: "Ultra-vibrant high-contrast action reel demonstrating synchronized stereo audio and rapid visual frames.",
    language: "Soundtrack"
  },
  {
    id: "for-bigger-escapes",
    title: "For Bigger Escapes",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    poster: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80",
    duration: "0:15",
    genre: "Nature / Mountains",
    description: "Spectacular alpine vistas and sweeping wilderness scenes engineered for multi-peer synchronized clarity.",
    language: "Music"
  }
];

export interface YouTubeSample {
  id: string;
  title: string;
  url: string;
  youtubeId: string;
  poster: string;
  duration: string;
  genre: string;
  description: string;
}

export const YOUTUBE_SAMPLE_VIDEOS: YouTubeSample[] = [
  {
    id: "yt-cosmos-laundromat",
    title: "Cosmos Laundromat (Sci-Fi Animation)",
    url: "https://www.youtube.com/watch?v=Y-rmzh0PI3c",
    youtubeId: "Y-rmzh0PI3c",
    poster: "https://img.youtube.com/vi/Y-rmzh0PI3c/hqdefault.jpg",
    duration: "12:10",
    genre: "Sci-Fi / Drama",
    description: "Award-winning surreal animation about a desolate sheep on a lonely island who gets a magical chance at transformation."
  },
  {
    id: "yt-spring",
    title: "Spring (Fantasy Animation)",
    url: "https://www.youtube.com/watch?v=WhWc3b3KhnY",
    youtubeId: "WhWc3b3KhnY",
    poster: "https://img.youtube.com/vi/WhWc3b3KhnY/hqdefault.jpg",
    duration: "7:44",
    genre: "Fantasy / Nature",
    description: "A shepherd girl and her dog face ancient spirits to bring spring to an icy world."
  },
  {
    id: "yt-agent-327",
    title: "Agent 327: Operation Barbershop",
    url: "https://www.youtube.com/watch?v=mN0zPOpADL4",
    youtubeId: "mN0zPOpADL4",
    poster: "https://img.youtube.com/vi/mN0zPOpADL4/hqdefault.jpg",
    duration: "3:51",
    genre: "Spy / Comedy Action",
    description: "Secret agent Hendrick investigates a suspicious barbershop with hilariously dangerous secret-agent combat."
  },
  {
    id: "yt-charge",
    title: "Charge (Cyberpunk Action 4K)",
    url: "https://www.youtube.com/watch?v=UXqq0ZvbOnk",
    youtubeId: "UXqq0ZvbOnk",
    poster: "https://img.youtube.com/vi/UXqq0ZvbOnk/hqdefault.jpg",
    duration: "3:11",
    genre: "Cyberpunk / CGI Action",
    description: "An old robotic hunter in a dystopian factory confronts high-voltage battle droids for precious energy."
  },
  {
    id: "yt-lofi",
    title: "Lofi Beats to Chill / Watch Together",
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    youtubeId: "jfKfPfyJRdk",
    poster: "https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg",
    duration: "Live / Continuous",
    genre: "Music / Chillout",
    description: "Calm aesthetic lo-fi cinema beats synchronized for late-night talks and shared studying."
  },
  {
    id: "yt-nature",
    title: "Wilderness 4K Cinematic Nature",
    url: "https://www.youtube.com/watch?v=lM02vNMRXFU",
    youtubeId: "lM02vNMRXFU",
    poster: "https://img.youtube.com/vi/lM02vNMRXFU/hqdefault.jpg",
    duration: "10:00",
    genre: "Nature / 4K Scenery",
    description: "Breathtaking mountain peaks, turquoise waters, and vibrant wildlife in ultra-crisp high definition."
  }
];
