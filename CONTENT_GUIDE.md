# Content Editing Guide

All editable content lives in **[data.js](data.js)**. Images go in **[assets/images/](assets/images/)**. You don't need to touch HTML, CSS, or application logic to update text, photos, songs, tools, peripherals, or works.

---

## Quick Map of `data.js`

| What to change | Where in `data.js` | Notes |
| --- | --- | --- |
| Optional Cloudflare Worker | `backend.workerUrl` | Leave `""` for 100% static GitHub Pages; paste your Worker URL later for a 1-line backend upgrade |
| Tab title | `index.html` `<title>` | Currently `Sachiko Fukuari` with 🌸 favicon |
| Intro greeting / cue | `intro.greeting`, `intro.cue` | Shown above the closed lotus |
| Display name, subtitle, tag, bio | `profile.name`, `profile.subName`, `profile.tag`, `profile.description` | `subName` renders cleanly on its own line below `name` |
| Banner image & art credit | `profile.banner`, `profile.bannerCredit` | Put image in `assets/images/` and set credit text cleanly |
| Vietnamese translation | Any `vi: { ... }` block & `ui.vi` | Flag icon button at top-right toggles the entire page EN ↔ VI |
| Profile picture | `profile.discordUserId` | Automatically syncs your live Discord avatar |
| Favourite song widget | `music.youtubeUrl`, `startAt`, `defaultVolume`, `title`, `artist`, `album` | Paste any YouTube URL; `startAt` accepts `"3:00"` or seconds; `defaultVolume` is `0–100` |
| Vitals offline message | `vitals.offlineNote` | Defaults to `"monitor not on right now"` |
| Software tools | `tools.software` | Add/remove objects in the array |
| Peripherals | `tools.peripherals` | Empty `[]` displays `"to be updated"` |
| Works / projects | `works.items` | Empty `[]` displays `"to be updated"` |
| Contact links | `contact.items` | Add `{ label, sublabel, url, icon }` entries |

---

## Adding a Software Tool or Peripheral

Inside `tools.software` or `tools.peripherals` in `data.js`, copy and paste an object:

```js
{
  id: "figma",
  title: "Figma",
  subtitle: "ui design",
  tag: "design",
  status: "daily",
  badge: "Fg",         // shown if `image` is empty ("")
  accent: "#f48fb1",   // badge highlight color
  image: "",           // optional: "assets/images/figma.png"
  description: "Interface design, prototypes, and layout systems.",
  url: "https://figma.com",
}
```

## Adding a Work / Project

Inside `works.items` in `data.js`, copy and paste an object:

```js
{
  id: "my-work-1",
  title: "Visual Identity System",
  category: "Design",
  year: "2026",
  status: "released",
  image: "assets/images/work-1.jpg", // or "" for pastel gradient cover
  gallery: ["assets/images/work-1a.jpg", "assets/images/work-1b.jpg"], // optional multi-image gallery
  videoUrl: "", // optional YouTube URL or MP4 path
  description: "Brand identity crafted with Illustrator and InDesign.",
  tags: ["Illustrator", "InDesign"],
  url: "https://example.com",
}
```

> Filter tabs on **Works** appear automatically once you add items!
> Leaving `tools.peripherals` or `works.items` empty (`[]`) shows a clean **"to be updated"** placeholder card.
