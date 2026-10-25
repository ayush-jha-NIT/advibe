/** Database URLs remain server-side and are never returned through HTTP. */
export interface DatabaseConfig { runtimeUrl: string; migrationUrl: string; }

function parseUrl(name: string, value: string | undefined, production: boolean): string {
  if (!value?.trim()) throw new Error(name + " is required");
  let url: URL;
  try { url = new URL(value); }
  catch { throw new Error(name + " must be a valid PostgreSQL URL"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname || !url.username || !url.password) {
    throw new Error(name + " must include a host and credentials");
  }
  if (production) {
    if (!["require", "verify-ca", "verify-full"].includes(url.searchParams.get("sslmode") ?? "")) {
      throw new Error(name + " requires sslmode=require or stronger in production");
    }
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
      throw new Error(name + " cannot point to loopback in production");
    }
  }
  return value;
}

export function loadDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const production = env.NODE_ENV === "production";
  return {
    runtimeUrl: parseUrl("DATABASE_URL", env.DATABASE_URL, production),
    migrationUrl: parseUrl("DIRECT_URL", env.DIRECT_URL, production),
  };
}
