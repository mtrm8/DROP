import { copyFile } from "node:fs/promises";

// GitHub Pages serves directory indexes for /DROP/bunker/, while this alias
// also supports clean URLs that arrive without the final slash.
await copyFile("out/bunker/index.html", "out/bunker.html");

// Keep a static-site fallback so direct client routes do not stop at Pages 404.
await copyFile("out/index.html", "out/404.html");

// The report is also a static JSON asset. Open Bunker sessions can pick up a
// newer processed build without refreshing the page or bypassing the code gate.
await copyFile("components/bunker/generatedReport.json", "out/bunker-data.json");
