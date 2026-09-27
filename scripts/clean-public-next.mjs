import { rm } from "node:fs/promises";

// A previous Pages build may have copied exported assets into public/. Next
// refuses to build while public/_next shadows its own _next output.
await rm(new URL("../public/_next", import.meta.url), { recursive: true, force: true });
