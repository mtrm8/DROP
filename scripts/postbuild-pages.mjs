import { copyFile } from "node:fs/promises";

// GitHub Pages serves directory indexes for the Bunker routes; aliases also
// support clean URLs that arrive without the final slash.
await copyFile("out/bunker/index.html", "out/bunker.html");
await copyFile("out/ai-bunker/index.html", "out/ai-bunker.html");

// Keep a static-site fallback so direct client routes do not stop at Pages 404.
await copyFile("out/index.html", "out/404.html");

// The automated AI report is also a public static JSON asset. Open member
// sessions can pick up a newer processed build without refreshing the page.
await copyFile("components/bunker/generatedReport.json", "out/bunker-data.json");
