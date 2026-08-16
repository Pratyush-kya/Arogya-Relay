import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * Declares the Cloudflare bindings this project may receive.
 *
 * `@cloudflare/workers-types` exposes `Env` as a global interface, so it is
 * augmented here rather than inside a module block.
 *
 * `.openai/hosting.json` currently sets `d1: null`, meaning no D1 binding is
 * injected. `DB` is therefore optional: the guard in `getDb()` is a real
 * runtime check, not dead code.
 */
declare global {
  // A namespace is required here: @cloudflare/workers-types exposes its
  // bindings type as `Cloudflare.Env`, so this is the only way to augment it.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cloudflare {
    interface Env {
      DB?: D1Database;
    }
  }
}

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}
