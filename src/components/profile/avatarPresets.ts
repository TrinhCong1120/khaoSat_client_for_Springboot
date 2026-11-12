export interface AvatarPreset {
  id: string;
  name: string;
  gradient: string;
  category: "memoji" | "gradient" | "character";
  svgDataUri: string;
}

// Bộ sưu tập avatar SVG vector dạng data URI tinh xảo, nhẹ và hiển thị sắc nét trên mọi màn hình
const createAvatarSvg = (bgColor1: string, bgColor2: string, emoji: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgColor1}" />
        <stop offset="100%" stop-color="${bgColor2}" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="28" fill="url(#g)" />
    <circle cx="50" cy="50" r="38" fill="white" fill-opacity="0.15" />
    <text x="50" y="58" font-size="40" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, sans-serif">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "preset-1",
    name: "Tech Lead",
    gradient: "from-blue-500 to-indigo-600",
    category: "memoji",
    svgDataUri: createAvatarSvg("#3b82f6", "#4f46e5", "👨‍💻"),
  },
  {
    id: "preset-2",
    name: "Product Design",
    gradient: "from-purple-500 to-pink-500",
    category: "memoji",
    svgDataUri: createAvatarSvg("#8b5cf6", "#ec4899", "👩‍🎨"),
  },
  {
    id: "preset-3",
    name: "Analyst",
    gradient: "from-emerald-400 to-teal-600",
    category: "memoji",
    svgDataUri: createAvatarSvg("#10b981", "#0d9488", "🕵️‍♂️"),
  },
  {
    id: "preset-4",
    name: "Researcher",
    gradient: "from-amber-400 to-orange-500",
    category: "memoji",
    svgDataUri: createAvatarSvg("#f59e0b", "#f97316", "👩‍🔬"),
  },
  {
    id: "preset-5",
    name: "Super Star",
    gradient: "from-yellow-400 to-amber-600",
    category: "character",
    svgDataUri: createAvatarSvg("#fbbf24", "#d97706", "🌟"),
  },
  {
    id: "preset-6",
    name: "Rocket Explorer",
    gradient: "from-rose-500 to-red-600",
    category: "character",
    svgDataUri: createAvatarSvg("#f43f5e", "#dc2626", "🚀"),
  },
  {
    id: "preset-7",
    name: "Zen Master",
    gradient: "from-cyan-400 to-blue-600",
    category: "character",
    svgDataUri: createAvatarSvg("#06b6d4", "#2563eb", "🧘"),
  },
  {
    id: "preset-8",
    name: "Shield Guardian",
    gradient: "from-violet-500 to-indigo-700",
    category: "character",
    svgDataUri: createAvatarSvg("#8b5cf6", "#4338ca", "🛡️"),
  },
  {
    id: "preset-9",
    name: "Neon Aurora",
    gradient: "from-emerald-400 to-sky-500",
    category: "gradient",
    svgDataUri: createAvatarSvg("#34d399", "#0ea5e9", "✨"),
  },
  {
    id: "preset-10",
    name: "Sunset Coral",
    gradient: "from-orange-400 to-rose-500",
    category: "gradient",
    svgDataUri: createAvatarSvg("#fb923c", "#f43f5e", "🔥"),
  },
  {
    id: "preset-11",
    name: "Cyber Pulse",
    gradient: "from-fuchsia-500 to-purple-600",
    category: "gradient",
    svgDataUri: createAvatarSvg("#d946ef", "#9333ea", "⚡"),
  },
  {
    id: "preset-12",
    name: "Ocean Breeze",
    gradient: "from-teal-400 to-cyan-600",
    category: "gradient",
    svgDataUri: createAvatarSvg("#2dd4bf", "#0891b2", "🌊"),
  },
];
