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
    cue: "Scroll or click to bloom",
    lotusAriaLabel: "Bloom lotus to enter portfolio",
  },

  decorations: {
    sakuraAccents: true,
  },

  profile: {
    name: "Your Name",
    sparkle: "✦",
    handle: "@yourhandle",
    location: "your city",
    pronouns: "they/them",
    joined: "est. 2026",
    bio: "designer // developer // creative :3",
    // Replace `null` with "assets/images/banner.jpg" to use a custom header banner
    bannerImage: null,
    // Replace `null` with "assets/images/avatar.jpg" to use a custom avatar photo
    avatarImage: null,
    primaryAction: {
      label: "+ card",
      targetTab: "card",
    },
    socials: [
      { label: "GitHub", icon: "github", url: "https://github.com/" },
      { label: "Discord", icon: "discord", url: "#card" },
      { label: "Email", icon: "mail", url: "mailto:hello@example.com" },
    ],
    stats: [
      { label: "projects", value: "12" },
      { label: "tools", value: "8" },
      { label: "craft", value: "✦" },
    ],
    badges: [],
  },

  activeUsesSection: {
    heading: "Active Peripherals",
    viewAllLabel: "see all uses →",
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
      url: "#uses",
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
      url: "#uses",
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
      url: "#uses",
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
      { name: "Tactical FPS", shortCode: "VAL", iconType: "crosshair", url: "#uses", accent: "#f0859f" },
      { name: "Arena Movement", shortCode: "FIN", iconType: "triangle", url: "#uses", accent: "#f6b2c9" },
      { name: "Cozy Rhythm", shortCode: "RHY", iconType: "music", url: "#uses", accent: "#e898d4" },
      { name: "Sketch & Tea", shortCode: "ART", iconType: "sparkle", url: "#works", accent: "#f9c6d7" },
    ],
  },

  worksSection: {
    heading: "Works & Assets",
    subtitle: "Selected projects, illustrations, interactive experiments, and downloadable goodies.",
  },

  works: [
    {
      id: "work-lotus-garden",
      title: "Sakura Meadow WebGL Study",
      category: "Code",
      year: "2026",
      status: "live",
      summary: "Procedural botanical point-sprite renderer with blurred foreground bokeh, far twilight fade, central 3D sakura bloom, and drifting white-rose mist.",
      tags: ["WebGL", "GLSL", "Vanilla JS"],
      image: null,
      gradientSeed: 1,
      url: "#home",
    },
    {
      id: "work-sakura-ui",
      title: "Dusty Rose Card Kit",
      category: "Assets",
      year: "2026",
      status: "freebie",
      summary: "Stacked deck card templates, pastel surface tokens, and inline botanical SVG accents crafted for personal corner sites.",
      tags: ["Design System", "CSS", "SVG"],
      image: null,
      gradientSeed: 2,
      url: "#uses",
    },
    {
      id: "work-petal-brushes",
      title: "Falling Petal Cursor Trail",
      category: "Code",
      year: "2026",
      status: "open source",
      summary: "High-DPI Canvas2D particle emitter using cached multi-tone petal sprites, distance interpolation, and sinusoidal breeze tumble.",
      tags: ["Canvas2D", "Physics", "Motion"],
      image: null,
      gradientSeed: 3,
      url: "#home",
    },
    {
      id: "work-sketchbook",
      title: "Pastel Ink Sketchbook",
      category: "Art",
      year: "2025",
      status: "archive",
      summary: "Monochrome lilac line studies, soft blossom stickers, and cozy character portraits painted between late-night tea sessions.",
      tags: ["Illustration", "Procreate", "Stickers"],
      image: null,
      gradientSeed: 4,
      url: "#card",
    },
    {
      id: "work-notes",
      title: "Slow Web Field Notes",
      category: "Writing",
      year: "2025",
      status: "essay",
      summary: "Notes on zero-build personal websites, tactile hover micro-interactions, and designing warm digital spaces that feel handmade.",
      tags: ["Essays", "Web Craft", "Notes"],
      image: null,
      gradientSeed: 5,
      url: "#card",
    },
  ],

  links: {
    heading: "Links & Card",
    cardBio: "Building cozy interactive web spaces, clean hardware setups, and pastel visual toys. Always happy to chat about creative front-end, custom keyboards, or art swaps.",
    currently: [
      { label: "Listening", value: "ambient rose lo-fi & acousticOSTs" },
      { label: "Tinkering", value: "WebGL floral shaders & split keymaps" },
      { label: "Open to", value: "creative collabs & small web commissions" },
    ],
    items: [
      { label: "GitHub", sublabel: "Code, shaders, and static web experiments", url: "https://github.com/", icon: "github" },
      { label: "Discord", sublabel: "@yourhandle — fastest way to say hi", url: "https://discord.com/", icon: "discord" },
      { label: "Art & Moodboard", sublabel: "Sketches, setups, and color studies", url: "#works", icon: "palette" },
      { label: "Direct Email", sublabel: "hello@example.com — project & collab inquiries", url: "mailto:hello@example.com", icon: "mail" },
      { label: "Gear & Setup List", sublabel: "Full list of peripherals and daily software", url: "#uses", icon: "keyboard" },
    ],
  },
};
