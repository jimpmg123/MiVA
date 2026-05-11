import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { HttpErrorFilter } from "./http-error.filter.js";
import { MivaApiService } from "./api.service.js";

const PORT = Number(process.env.MIVA_API_PORT || 4000);

const allowedOrigins = new Set([
  "http://localhost:1420",
  "http://127.0.0.1:1420",
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
]);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
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

