import { chromium } from "playwright";

const EXPECTED = {
  "WebOS": "https://github.com/rayyans4890-png/WebOS",
  "Study OS": "https://github.com/rayyans4890-png/Study-Website",
  "My Hackpad": "https://github.com/rayyans4890-png/hackatime_project",
  "Wario Game": "https://github.com/rayyans4890-png/Wario-game-Stardance-project",
};

async function attempt() {
  const errors = [];
  let browser;
  browser = await chromium.launch({
    executablePath: "/home/user/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell",
    args: ["--no-sandbox", "--use-gl=swiftshader", "--disable-dev-shm-usage", "--js-flags=--max-old-space-size=400"],
  });
  const page = await browser.newPage({ viewport: { width: 480, height: 360 } });
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 140)); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message.slice(0, 140)));

  await page.goto("http://localhost:5174", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(2000);
    if (await page.evaluate(() => !!document.querySelector("button.loading-enter")).catch(() => false)) break;
  }
  await page.evaluate(() => document.querySelector("button.loading-enter")?.click());
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(2000);
    const buf = await page.screenshot().catch(() => null);
    if (buf && buf.length > 30000) { console.log("rendered", (i + 1) * 2, "s"); break; }
  }

  for (let i = 0; i < 72; i++) {
    await page.evaluate(() => window.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, bubbles: true })));
    if (i % 20 === 19) await page.waitForTimeout(400);
  }
  await page.waitForTimeout(100000);
  await page.screenshot({ path: "/tmp/v9-wall.png" });

  const found = {};
  const xs = [55, 80, 105, 130, 155, 180, 205, 230, 255, 280, 305, 330, 355, 67, 92, 117, 142, 167, 192, 217, 242, 267, 292, 317, 342];
  const ys = [185, 150, 220, 130, 165, 200, 235];
  let done = false;
  for (const y of ys) {
    if (done) break;
    for (const x of xs) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(500);
      const t = await page.textContent(".modal-title").catch(() => null);
      if (t) {
        const title = t.trim();
        if (!found[title]) {
          found[title] = await page.getAttribute(".modal-body a[href]", "href").catch(() => null);
          console.log("MODAL:", title, "->", found[title], "at", x, y);
          if (Object.keys(found).length >= 4) done = true;
        }
        await page.click(".modal-close").catch(() => {});
        await page.waitForTimeout(600);
        if (done) break;
      }
    }
  }
  return { found, errors };
}

for (let n = 1; n <= 3; n++) {
  try {
    console.log("=== attempt", n, "===");
    const { found, errors } = await attempt();
    const titles = Object.keys(found);
    const allOk = titles.length >= 4 && titles.every((t) => found[t] === EXPECTED[t]);
    console.log("RESULT", JSON.stringify({ found, errors: errors.slice(0, 6) }, null, 1));
    console.log(allOk ? "ALL FOUR MODALS CORRECT" : "INCOMPLETE/MISMATCH");
    if (allOk) process.exit(0);
  } catch (e) {
    console.log("attempt", n, "failed:", e.message.split("\n")[0]);
  }
}
console.log("FAILED");
