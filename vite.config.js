import { basename } from "node:path";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

/**
 * Copies static runtime image assets (`assets/images/`) into `dist/assets/images/`
 * so user-editable URLs in `data.js` resolve cleanly in both dev and production,
 * excluding repository/OS metadata dotfiles.
 */
function copyStaticImagesPlugin() {
  return {
    name: "copy-static-images",
    closeBundle() {
      const srcDir = resolve(process.cwd(), "assets/images");
      const outDir = resolve(process.cwd(), "dist/assets/images");
      if (!existsSync(srcDir)) return;
      mkdirSync(outDir, { recursive: true });
      cpSync(srcDir, outDir, {
        recursive: true,
        filter: (src) => {
          const name = basename(src);
          return name !== ".gitkeep" && name !== ".DS_Store";
        },
      });
    },
  };
}

export default defineConfig({
  base: "/",
  build: {
    outDir: "dist",
    target: "es2020",
    minify: "esbuild",
    cssMinify: true,
    sourcemap: false,
  },
  plugins: [copyStaticImagesPlugin()],
});

