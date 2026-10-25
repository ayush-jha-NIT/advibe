import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().trim().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
});

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  corsOrigins: string[];
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
  trustProxy: boolean;
}

function parseOrigin(value: string, production: boolean): string {
  if (value === "*" || value === "null") throw new Error("CORS_ORIGINS cannot include wildcards or null");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("CORS_ORIGINS must contain valid HTTP(S) origins");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash || url.origin !== value) {
    throw new Error("CORS_ORIGINS must contain exact HTTP(S) origins without paths or credentials");
  }
  if (production && url.protocol !== "https:") {
    throw new Error("Production CORS_ORIGINS must use HTTPS");
  }
  return value;
}

export function loadConfig(input: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const keys = [...new Set(parsed.error.issues.map(issue => issue.path.join(".") || "environment"))];
    throw new Error("Invalid backend environment configuration: " + keys.join(", "));
  }

  const env = parsed.data;
  if (env.NODE_ENV === "production" && !input.CORS_ORIGINS?.trim()) {
    throw new Error("Production requires explicit CORS_ORIGINS");
  }
  const corsOrigins = [...new Set(
    env.CORS_ORIGINS.split(",").map(value => value.trim()).filter(Boolean)
      .map(value => parseOrigin(value, env.NODE_ENV === "production")),
  )];
  if (corsOrigins.length === 0) throw new Error("At least one CORS origin is required");
  return {
    nodeEnv: env.NODE_ENV,
    host: env.HOST,
    port: env.PORT,
    corsOrigins,
    logLevel: env.LOG_LEVEL,
    trustProxy: env.TRUST_PROXY === "true",
  };
}
