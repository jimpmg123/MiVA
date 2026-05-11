import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      response.status(status).json(typeof payload === "object" ? payload : {
        error: "MIVA_API_ERROR",
        message: String(payload),
      });
      return;
    }

    const error = exception as Error & { statusCode?: number; error?: string };
    const statusCode = Number.isInteger(error?.statusCode) ? Number(error.statusCode) : 500;
    response.status(statusCode).json({
      error: error?.error || "MIVA_API_ERROR",
      message: error?.message || "Unexpected API error.",
    });
  }
}

