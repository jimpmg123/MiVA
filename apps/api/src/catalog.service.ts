import { Injectable } from "@nestjs/common";
import { lightweightModels } from "../../../packages/shared/src/index.js";

@Injectable()
export class CatalogService {
  getCatalogModels() {
    return { models: lightweightModels };
  }
}
