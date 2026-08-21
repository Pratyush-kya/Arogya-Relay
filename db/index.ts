import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * Declares the Cloudflare bindings this project may receive.
 *
 * `@cloudflare/workers-types` exposes `Env` as a global interface, so it is
 * augmented here rather than inside a module block.
 *
 * `.openai/hosting.json` currently sets `d1: "DB"` and `r2: "R2"`, which
 * inject the real bindings. `DB` and `R2` remain optional behind real runtime
 * guards, so the app still builds and runs in a pure-frontend mode.
 */
declare global {
  // A namespace is required here: @cloudflare/workers-types exposes its
  // bindings type as `Cloudflare.Env`, so this is the only way to augment it.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cloudflare {
    interface Env {
      DB?: D1Database;
      R2?: R2Bucket;
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

/** Returns the R2 bucket for approved documents / model / knowledge-pack assets. */
export function getR2() {
  if (!env.R2) {
    throw new Error(
      "Cloudflare R2 binding `R2` is unavailable. Set the `r2` field in .openai/hosting.json to `R2` or let your control plane inject the real binding values before using object storage."
    );
  }
  return env.R2;
}
