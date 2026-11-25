/**
 * ============================================================================
 * PORTFOLIO DATA CONFIGURATION
 * ============================================================================
 * Edit this file to customize everything on your portfolio without touching
 * HTML or application logic.
 *
 * Tips:
 * - Put custom photos in `assets/images/` (for example, `assets/images/avatar.jpg`)
 *   and set `bannerImage`, `avatarImage`, or an item's `image` to that path.
 * - Leave any `image` set to `null` to display the built-in pastel rose SVG artwork.
 * - Set `stats` to `[]` if you prefer to hide the stats numbers in the hero card.
 */

window.PORTFOLIO_DATA = {
  intro: {
    greeting: "Hello, im Ari",
    cue: "scroll or click",
    lotusAriaLabel: "Bloom lotus to enter portfolio",
  },

  decorations: {
    sakuraAccents: true,
  },

  profile: {
    name: "Sachiko Fukuari (幸子福有)",
    sparkle: "",
    handle: "@sachikofukuari",
    location: "",
    pronouns: "",
    joined: "",
    bio: "be kind! 💖🌸 ",
    bannerImage: "assets/images/banner.jpg?v=4",
    // Set your 17-19 digit Discord User ID here to auto-sync your live Discord profile picture
    discordUserId: "732043268946133133",
    avatarImage: "https://cdn.discordapp.com/avatars/732043268946133133/c232585fd1847e1c3666537a61429aa1.webp?size=256",
    primaryAction: {
      label: "contact",
      targetTab: "contact",
    },
    socials: [],
    stats: [],
    badges: [],
  },

  homeWidgets: {
    favoriteSong: {
      heading: "favourite song right now",
      videoId: "6RWCiktXFfI",
      title: "LK Cứ Trao Đi, Chưa Bao Giờ",
      artist: "Hà Anh Tuấn ft. Thu Phương",
      album: "Sketch a Rose",
      url: "https://youtu.be/6RWCiktXFfI?si=29Jsj7z8XsWH83Zh",
      musicUrl: "https://music.youtube.com/watch?v=6RWCiktXFfI",
      thumbnail: "https://i.ytimg.com/vi/6RWCiktXFfI/hqdefault.jpg",
    },
    heartRate: {
      heading: "live vitals",
      timezone: "Asia/Ho_Chi_Minh",
      timezoneLabel: "UTC+7",
      pulsoidWsUrl: "wss://dev.pulsoid.net/api/v1/data/real_time?access_token=859d5fed-9af3-4f09-bc8f-98cd4c5df159&response_mode=legacy_json",
      offlineTimeoutMs: 15000,
    },
  },

  activeUsesSection: {
    heading: "Tools & Setup",
    viewAllLabel: "see all tools →",
  },

  // Software & Peripherals items displayed in the `tools` tab.
  activeUses: [
    {
      id: "software-design",
      featured: false,
      status: "daily",
      category: "design & art",
      filterGroup: "Software",
      brand: "figma / clip studio",
      name: "ui & illustration stack",
      image: null,
      iconType: "palette",
      notes: "Where wireframes, color palettes, botanical motifs, and brush packs come together.",
      url: "#works",
    },
    {
      id: "software-code",
      featured: false,
      status: "daily",
      category: "editor & shaders",
      filterGroup: "Software",
      brand: "neovim / webgl",
      name: "creative dev setup",
      image: null,
      iconType: "code",
      notes: "Minimal rose-tinted editor theme, custom GLSL sandboxes, and clean static builds.",
      url: "#works",
    },
    {
      id: "mouse-superlight",
      featured: true,
      status: "in use",
      category: "mouse",
      filterGroup: "Peripherals",
      brand: "logitech",
      name: "g pro x superlight 2",
      image: null,
      iconType: "mouse",
      notes: "Featherlight wireless shape with crisp clicks for daily sketching, coding, and competitive play.",
      url: "https://www.logitechg.com/",
    },
    {
      id: "pad-pastel-glass",
      featured: true,
      status: "in use",
      category: "mousepad",
      filterGroup: "Peripherals",
      brand: "custom glass",
      name: "sakura mist surface",
      image: null,
      iconType: "mousepad",
      notes: "Silky low-friction glide with soft rose artwork — effortless micro-adjustments and easy to clean.",
      url: "#works",
    },
    {
      id: "kb-lily58",
      featured: true,
      status: "in use",
      category: "keyboard",
      filterGroup: "Peripherals",
      brand: "split ergo",
      name: "lily58 pro custom",
      image: null,
      iconType: "keyboard",
      notes: "Column-staggered split layout with tactile silent switches and creamy pastel keycaps.",
      url: "#tools",
    },
    {
      id: "tablet-pen",
      featured: false,
      status: "in use",
      category: "pen display",
      filterGroup: "Peripherals",
      brand: "wacom",
      name: "intuos pro medium",
      image: null,
      iconType: "tablet",
      notes: "Natural tilt response for character illustrations, sticker sheets, and vector linework.",
      url: "#works",
    },
  ],

  favorites: {
    heading: "Games & Favorites",
    items: [
      { name: "Tactical FPS", shortCode: "VAL", iconType: "crosshair", url: "#tools", accent: "#f0859f" },
      { name: "Arena Movement", shortCode: "FIN", iconType: "triangle", url: "#tools", accent: "#f6b2c9" },
      { name: "Cozy Rhythm", shortCode: "RHY", iconType: "music", url: "#tools", accent: "#e898d4" },
      { name: "Sketch & Tea", shortCode: "ART", iconType: "sparkle", url: "#works", accent: "#f9c6d7" },
    ],
  },

  worksSection: {
    heading: "Works",
    subtitle: "",
  },

  works: [],

  links: {
    heading: "Contact",
    cardBio: "be kind! 💖🌸 ",
    currently: [],
    items: [
      { label: "GitHub", sublabel: "sachikofukuari", url: "https://github.com/sachikofukuari", icon: "github" },
      { label: "Discord", sublabel: "@sachikofukuari", url: "https://discord.com/", icon: "discord" },
      { label: "Tools & Setup", sublabel: "Software, peripherals, and daily workflow", url: "#tools", icon: "keyboard" },
    ],
  },
};
