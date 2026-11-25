/**
 * ============================================================================
 * PORTFOLIO CONTENT CONFIGURATION (EDIT HERE!)
 * ============================================================================
 * Everything you normally update lives in this one file:
 * - Intro text
 * - Profile (name, tag, description, banner, Discord avatar, contact button)
 * - Favourite song (YouTube / YouTube Music link, title, artist, album)
 * - Live vitals (Pulsoid heart rate + local time)
 * - Tools (Software & Peripherals — leave [] to show "to be updated")
 * - Works (leave [] to show a clean "to be updated" example card)
 * - Contact links
 *
 * See CONTENT_GUIDE.md for step-by-step copy-paste examples & image tips.
 */

window.PORTFOLIO_DATA = {
  // 1. LANDING / INTRO SCREEN
  intro: {
    greeting: "Hello, im Ari",
    cue: "scroll or click",
    lotusAriaLabel: "Bloom lotus to enter portfolio",
  },

  decorations: {
    sakuraAccents: true,
  },

  // 2. PROFILE CARD (HOME PAGE)
  profile: {
    name: "Sachiko Fukuari (幸子福有)",
    tag: "@sachikofukuari",
    description: "be kind! 💖🌸 ",
    banner: "assets/images/banner.jpg?v=5",
    // Your Discord User ID (auto-syncs your current Discord profile picture)
    discordUserId: "732043268946133133",
    avatarFallback: "https://cdn.discordapp.com/avatars/732043268946133133/c232585fd1847e1c3666537a61429aa1.webp?size=256",
    contactButtonLabel: "contact",
  },

  // 3. FAVOURITE SONG WIDGET (LEFT HOME WIDGET)
  // Paste any YouTube / youtu.be / YouTube Music URL in `youtubeUrl`.
  // Cover thumbnail auto-loads from YouTube unless you set `coverImage`.
  music: {
    heading: "favourite song right now",
    youtubeUrl: "https://youtu.be/6RWCiktXFfI?si=29Jsj7z8XsWH83Zh",
    title: "LK Cứ Trao Đi, Chưa Bao Giờ",
    artist: "Hà Anh Tuấn ft. Thu Phương",
    album: "Sketch a Rose",
    coverImage: "",
  },

  // 4. LIVE VITALS WIDGET (RIGHT HOME WIDGET)
  vitals: {
    heading: "live vitals",
    timezone: "Asia/Ho_Chi_Minh",
    timezoneLabel: "UTC+7",
    offlineNote: "monitor not on right now",
    pulsoidWsUrl: "wss://dev.pulsoid.net/api/v1/data/real_time?access_token=859d5fed-9af3-4f09-bc8f-98cd4c5df159&response_mode=legacy_json",
    offlineTimeoutMs: 15000,
  },

  // 5. TOOLS TAB (SOFTWARE & PERIPHERALS)
  // Put custom images inside `assets/images/` and set `image: "assets/images/your-file.png"`.
  // Leave `image: ""` to show the clean badge/icon instead.
  tools: {
    heading: "Tools & Setup",
    subtitle: "Creative apps, coding tools, and setup essentials. Click any card for details.",
    emptyText: "to be updated",

    software: [
      /* Copy & paste this template to add another Software item:
      {
        id: "example-app",
        title: "App Name",
        subtitle: "short category",
        tag: "brand / suite",
        status: "daily",
        badge: "Ex",
        accent: "#ff96bf",
        image: "", // optional: "assets/images/example.png"
        description: "One or two sentences about how you use it.",
        url: "https://example.com",
      },
      */
      {
        id: "adobe-ai",
        title: "Adobe Illustrator",
        subtitle: "vector & branding",
        tag: "adobe creative cloud",
        status: "daily",
        badge: "Ai",
        accent: "#ff9a00",
        image: "",
        description: "Vector illustration, logos, iconography, and scalable artwork.",
        url: "https://www.adobe.com/products/illustrator.html",
      },
      {
        id: "adobe-pr",
        title: "Adobe Premiere Pro",
        subtitle: "video editing",
        tag: "adobe creative cloud",
        status: "daily",
        badge: "Pr",
        accent: "#9999ff",
        image: "",
        description: "Timeline video editing, pacing, audio mixing, and color grading.",
        url: "https://www.adobe.com/products/premiere.html",
      },
      {
        id: "adobe-ps",
        title: "Adobe Photoshop",
        subtitle: "photo & graphics",
        tag: "adobe creative cloud",
        status: "daily",
        badge: "Ps",
        accent: "#31a8ff",
        image: "",
        description: "Photo retouching, compositing, key visuals, and digital painting.",
        url: "https://www.adobe.com/products/photoshop.html",
      },
      {
        id: "adobe-id",
        title: "Adobe InDesign",
        subtitle: "editorial & layout",
        tag: "adobe creative cloud",
        status: "daily",
        badge: "Id",
        accent: "#ff3366",
        image: "",
        description: "Editorial layouts, typography systems, booklets, and print spreads.",
        url: "https://www.adobe.com/products/indesign.html",
      },
      {
        id: "vscode",
        title: "Visual Studio Code",
        subtitle: "code editor",
        tag: "coding",
        status: "daily",
        badge: "VS",
        accent: "#38bdf8",
        image: "",
        description: "Primary code editor for web builds, creative coding, and daily projects.",
        url: "https://code.visualstudio.com/",
      },
      {
        id: "gemini",
        title: "Gemini",
        subtitle: "ai assistant",
        tag: "coding & ai",
        status: "daily",
        badge: "✦",
        accent: "#c084fc",
        image: "",
        description: "AI companion for brainstorming, coding workflows, and debugging.",
        url: "https://gemini.google.com/",
      },
    ],

    // Leave `peripherals: []` empty to display a clean "to be updated" placeholder card.
    peripherals: [
      /* Copy & paste this template when you want to add Peripherals:
      {
        id: "mouse-1",
        title: "Mouse Name",
        subtitle: "mouse",
        tag: "brand",
        status: "in use",
        badge: "MS",
        accent: "#f48fb1",
        image: "", // e.g. "assets/images/mouse.jpg"
        description: "Notes about switches, weight, skates, or why you like it.",
        url: "",
      },
      */
    ],
  },

  // 6. WORKS TAB
  // Leave `items: []` empty to display a clean "to be updated" example card.
  works: {
    heading: "Works",
    subtitle: "",
    emptyText: "to be updated",
    items: [
      /* Copy & paste this template to add a project/work:
      {
        id: "project-1",
        title: "Project Title",
        category: "Design", // creates filter tabs automatically when items exist
        year: "2026",
        status: "released",
        image: "", // optional: "assets/images/project-1.jpg"
        description: "Short summary shown on the card and popup modal.",
        tags: ["Photoshop", "Illustrator"],
        url: "https://example.com",
      },
      */
    ],
  },

  // 7. CONTACT TAB
  contact: {
    heading: "Contact",
    description: "", // Leave blank to reuse `profile.description`
    items: [
      { label: "GitHub", sublabel: "sachikofukuari", url: "https://github.com/sachikofukuari", icon: "github" },
      { label: "Discord", sublabel: "@sachikofukuari", url: "https://discord.com/", icon: "discord" },
      { label: "Tools & Setup", sublabel: "Software, coding tools, and peripherals", url: "#tools", icon: "keyboard" },
    ],
  },
};
