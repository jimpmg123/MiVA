import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyDemoEnv } from "../../../packages/shared/src/demo-env.mjs";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(apiRoot, ".env") });
applyDemoEnv();
