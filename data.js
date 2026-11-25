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
    bannerImage: "assets/images/banner.jpg",
    // Set your 17-19 digit Discord User ID here to auto-sync your live Discord profile picture
    discordUserId: "",
    avatarImage: null,
    primaryAction: {
      label: "contact",
      targetTab: "contact",
    },
    socials: [],
    stats: [],
    badges: [],
  },

  activeUsesSection: {
    heading: "Tools & Setup",
    viewAllLabel: "see all tools →",
  },

  // First 4 items with `featured: true` appear in the Home stacked deck grid.
  // All items appear in the filterable `uses` view.
  activeUses: [
    {
      id: "mouse-superlight",
      featured: true,
      status: "in use",
      rating: "4.8",
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
      rating: "5.0",
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
      rating: "5.0",
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
      id: "headset-openback",
      featured: true,
      status: "in use",
      rating: "4.7",
      category: "headset",
      filterGroup: "Audio",
      brand: "audio-technica",
      name: "ath-r50x open-back",
      image: null,
      iconType: "headset",
      notes: "Airy soundstage and plush earpads built for long ambient playlists and crisp voice calls.",
      url: "#tools",
    },
    {
      id: "tablet-pen",
      featured: false,
      status: "in use",
      rating: "4.9",
      category: "pen display",
      filterGroup: "Peripherals",
      brand: "wacom",
      name: "intuos pro medium",
      image: null,
      iconType: "tablet",
      notes: "Natural tilt response for character illustrations, sticker sheets, and vector linework.",
      url: "#works",
    },
    {
      id: "mic-condenser",
      featured: false,
      status: "in use",
      rating: "4.6",
      category: "microphone",
      filterGroup: "Audio",
      brand: "shure",
      name: "mv7+ rose mount",
      image: null,
      iconType: "mic",
      notes: "Warm vocal presence on a low-profile boom arm that stays tucked neatly out of frame.",
      url: "#tools",
    },
    {
      id: "software-design",
      featured: false,
      status: "daily",
      rating: "5.0",
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
      rating: "4.9",
      category: "editor & shaders",
      filterGroup: "Software",
      brand: "neovim / webgl",
      name: "creative dev setup",
      image: null,
      iconType: "code",
      notes: "Minimal rose-tinted editor theme, custom GLSL sandboxes, and clean static builds.",
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
