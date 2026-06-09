import "./load-env.js";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { HttpErrorFilter } from "./http-error.filter.js";
import { MivaApiService } from "./api.service.js";

const PORT = Number(process.env.PORT || process.env.MIVA_API_PORT || 4000);
const configuredCorsOrigins = (process.env.MIVA_CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  "http://localhost:1420",
  "http://127.0.0.1:1420",
  "http://localhost:1421",
  "http://127.0.0.1:1421",
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  ...configuredCorsOrigins,
]);

function isLocalDevOrigin(origin: string) {
  try {
    const url = new URL(origin);
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
    const localPorts = new Set(["1420", "1421", "5173", "5174", "5175", "5176", String(PORT)]);
    return localHosts.has(url.hostname) && localPorts.has(url.port);
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin) || isLocalDevOrigin(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["content-type", "authorization"],
    },
  });
  app.useGlobalFilters(new HttpErrorFilter());

  await app.get(MivaApiService).ensureDevData();
  await app.listen(PORT, "0.0.0.0");
  console.log(`MiVA NestJS API listening on http://localhost:${PORT}`);
}

bootstrap().catch((error) => {
  console.error("Failed to initialize MiVA API", error);
  process.exit(1);
});
