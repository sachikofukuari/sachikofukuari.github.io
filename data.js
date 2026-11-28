/**
 * ============================================================================
 * PORTFOLIO CONTENT CONFIGURATION (EDIT HERE!)
 * ============================================================================
 * Everything you normally update lives in this one file:
 * - Optional Cloudflare Worker backend URL (1-line upgrade)
 * - Intro text (English + Vietnamese under `vi`)
 * - Profile (name, subName, tag, description, banner, bannerCredit, Discord ID)
 * - Favourite song (YouTube URL, start time, default volume, title, artist)
 * - Live vitals (Pulsoid heart rate + local time)
 * - Tools (Software & Peripherals — leave [] to show "to be updated")
 * - Works (leave [] to show a clean "to be updated" example card)
 * - Contact links & shared UI strings (`ui`)
 */

window.PORTFOLIO_DATA = {
  // 0. OPTIONAL BACKEND WORKER (1-LINE UPGRADE)
  // Leave "" for 100% static GitHub Pages. Set your Cloudflare Worker URL later
  // (e.g. "https://portfolio-api.yourname.workers.dev") to proxy Discord & Pulsoid.
  backend: {
    workerUrl: "",
  },

  // 1. LANDING / INTRO SCREEN
  intro: {
    greeting: "Hello, im Ari",
    greetingLines: ["Hello,", "im Ari"],
    cue: "scroll or click",
    lotusAriaLabel: "Bloom lotus to enter portfolio",
    vi: {
      greeting: "Xin chào, mình là Ari",
      greetingLines: ["Xin chào,", "mình là Ari"],
      cue: "cuộn hoặc nhấn",
      lotusAriaLabel: "Nở hoa sen để vào trang cá nhân",
    },
  },

  decorations: {
    sakuraAccents: true,
  },

  // 2. PROFILE CARD (HOME PAGE)
  profile: {
    name: "Sachiko Fukuari",
    subName: "(幸子福有)",
    tag: "@sachikofukuari",
    description: "be kind! 💖🌸 ",
    banner: "assets/images/banner.jpg?v=14",
    bannerWebp: "assets/images/banner.webp?v=14",
    bannerCredit: "Art by Takeshima Eku",
    // Your Discord User ID (auto-syncs your current Discord profile picture)
    discordUserId: "732043268946133133",
    avatarFallback: "https://cdn.discordapp.com/avatars/732043268946133133/c232585fd1847e1c3666537a61429aa1.webp?size=256",
    contactButtonLabel: "contact",
    vi: {
      bannerCredit: "Tranh bởi Takeshima Eku",
      contactButtonLabel: "liên hệ",
    },
  },

  // 3. FAVOURITE SONG WIDGET (LEFT HOME WIDGET)
  // Paste any YouTube / youtu.be / YouTube Music URL in `youtubeUrl`.
  // `startAt` supports "3:00" (mm:ss) or seconds (e.g. 180). `defaultVolume` is 0-100.
  music: {
    heading: "favourite song",
    youtubeUrl: "https://youtu.be/6RWCiktXFfI?si=29Jsj7z8XsWH83Zh",
    startAt: "3:00",
    defaultVolume: 50,
    title: "Chưa Bao Giờ",
    artist: "Hà Anh Tuấn ft. Thu Phương",
    album: "Sketch a Rose",
    coverImage: "",
    vi: {
      heading: "bài hát yêu thích",
    },
  },

  // 4. VITALS WIDGET (RIGHT HOME WIDGET)
  vitals: {
    heading: "vitals",
    timezone: "Asia/Ho_Chi_Minh",
    timezoneLabel: "UTC+7",
    liveLabel: "live",
    offlineNote: "monitor not on right now",
    localTimeLabel: "local time",
    pulsoidWsUrl: "wss://dev.pulsoid.net/api/v1/data/real_time?access_token=859d5fed-9af3-4f09-bc8f-98cd4c5df159&response_mode=legacy_json",
    offlineTimeoutMs: 15000,
    vi: {
      heading: "nhịp tim",
      liveLabel: "trực tiếp",
      offlineNote: "máy đo hiện chưa bật",
      localTimeLabel: "giờ địa phương",
    },
  },

  // 5. TOOLS TAB (SOFTWARE & PERIPHERALS)
  // Put custom images inside `assets/images/` and set `image: "assets/images/your-file.png"`.
  // Leave `image: ""` to show the clean badge/icon instead.
  tools: {
    heading: "Tools & Setup",
    subtitle: "Creative apps, coding tools, and daily setup essentials.",
    emptyText: "to be updated",
    vi: {
      heading: "Công cụ & Thiết lập",
      subtitle: "Ứng dụng sáng tạo, công cụ và thiết bị hàng ngày.",
      emptyText: "sẽ cập nhật sau",
      groups: {
        Software: "Phần mềm",
        Peripherals: "Thiết bị",
      },
    },

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
        vi: {
          subtitle: "danh mục ngắn",
          tag: "hãng / bộ công cụ",
          status: "hàng ngày",
          description: "Mô tả ngắn bằng tiếng Việt.",
        },
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
        vi: {
          subtitle: "vector & nhận diện",
          tag: "adobe creative cloud",
          status: "hàng ngày",
          description: "Vẽ minh họa vector, thiết kế logo, biểu tượng và đồ họa sắc nét ở mọi kích thước.",
        },
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
        vi: {
          subtitle: "dựng phim & video",
          tag: "adobe creative cloud",
          status: "hàng ngày",
          description: "Dựng video theo timeline, căn nhịp, hòa âm và chỉnh màu.",
        },
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
        vi: {
          subtitle: "ảnh & đồ họa",
          tag: "adobe creative cloud",
          status: "hàng ngày",
          description: "Chỉnh sửa ảnh, ghép hình, thiết kế key visual và vẽ kỹ thuật số.",
        },
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
        vi: {
          subtitle: "dàn trang & ấn phẩm",
          tag: "adobe creative cloud",
          status: "hàng ngày",
          description: "Bố cục tạp chí, hệ thống chữ, sách nhỏ và ấn phẩm in ấn.",
        },
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
        vi: {
          subtitle: "trình soạn thảo mã",
          tag: "lập trình",
          status: "hàng ngày",
          description: "Trình soạn thảo chính để xây dựng web, viết mã sáng tạo và các dự án hàng ngày.",
        },
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
        vi: {
          subtitle: "trợ lý ai",
          tag: "lập trình & ai",
          status: "hàng ngày",
          description: "Trợ lý AI đồng hành cùng lên ý tưởng, viết mã và gỡ lỗi.",
        },
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
    vi: {
      heading: "Tác phẩm",
      subtitle: "",
      emptyText: "sẽ cập nhật sau",
      pillLabel: "tác phẩm",
      soonLabel: "sắp ra mắt",
      allFilter: "Tất cả",
    },
    items: [
      /* Copy & paste this template to add a project/work:
      {
        id: "project-1",
        title: "Project Title",
        category: "Design", // creates filter tabs automatically when items exist
        year: "2026",
        status: "released",
        image: "", // optional: "assets/images/project-1.jpg"
        gallery: [], // optional: ["assets/images/p1-1.jpg", "assets/images/p1-2.jpg"]
        videoUrl: "", // optional: YouTube URL or "assets/videos/demo.mp4"
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
    vi: {
      heading: "Liên hệ",
      description: "",
    },
    items: [
      { label: "GitHub", sublabel: "sachikofukuari", url: "https://github.com/sachikofukuari", icon: "github" },
      { label: "Discord", sublabel: "@sachikofukuari", url: "https://discord.com/", icon: "discord" },
    ],
  },

  // 8. INTERFACE LABELS (EN / VI)
  ui: {
    en: {
      navHome: "home",
      navTools: "tools",
      navWorks: "works",
      navContact: "contact",
      backToIntro: "Back to intro",
      pauseMotion: "Pause motion",
      playMotion: "Play motion",
      switchLangLabel: "Chuyển sang Tiếng Việt",
      closeDetails: "Close details",
      copyHandle: "Copy handle",
      copyLink: "Copy page link",
      copiedPrefix: "Copied",
      copiedLink: "Copied portfolio link",
      copiedFallback: "Copied value:",
      visitLink: "Visit link ↗",
      goToTab: "Go to",
      playSong: "Play song",
      pauseSong: "Pause song",
      muteSong: "Mute",
      unmuteSong: "Unmute",
      seekTrack: "Seek track",
      volumeLabel: "Volume",
      openInYtMusic: "Open in YouTube Music",
      jumpToHomePlayer: "Jump to Home player",
      stopMiniPlayer: "Stop and hide mini player",
      bpmUnit: "bpm",
    },
    vi: {
      navHome: "trang chủ",
      navTools: "công cụ",
      navWorks: "tác phẩm",
      navContact: "liên hệ",
      backToIntro: "Quay lại màn hình chính",
      pauseMotion: "Tạm dừng chuyển động",
      playMotion: "Tiếp tục chuyển động",
      switchLangLabel: "Switch to English",
      closeDetails: "Đóng chi tiết",
      copyHandle: "Sao chép tên",
      copyLink: "Sao chép liên kết",
      copiedPrefix: "Đã sao chép",
      copiedLink: "Đã sao chép liên kết trang",
      copiedFallback: "Đã sao chép:",
      visitLink: "Mở liên kết ↗",
      goToTab: "Đi tới",
      playSong: "Phát nhạc",
      pauseSong: "Tạm dừng",
      muteSong: "Tắt tiếng",
      unmuteSong: "Bật tiếng",
      seekTrack: "Tua nhạc",
      volumeLabel: "Âm lượng",
      openInYtMusic: "Mở trong YouTube Music",
      jumpToHomePlayer: "Về trình phát trang chủ",
      stopMiniPlayer: "Dừng và ẩn trình phát thu gọn",
      bpmUnit: "nhịp/p",
    },
  },
};

