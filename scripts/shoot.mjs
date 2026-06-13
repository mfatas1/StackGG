// Screenshot helper for visual QA. Usage:
//   node scripts/shoot.mjs <path> <outfile> [width] [height] [full]
import { chromium } from "playwright";

const [pathArg = "/", out = "/tmp/shot.png", w = "1440", h = "900", full = "full"] = process.argv.slice(2);
const base = process.env.BASE_URL || "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 2 });
await page.goto(base + pathArg, { waitUntil: "networkidle" });
await page.waitForTimeout(1600); // let fonts + entrance + reveals settle
await page.screenshot({ path: out, fullPage: full === "full" });
await browser.close();
console.log("saved", out);
