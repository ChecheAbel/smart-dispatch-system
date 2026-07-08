import type { NextFunction, Request, Response } from "express";

function formatDuration(ms: number) {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Logs each HTTP request when it arrives and when the response finishes.
 * Example:
 *   → GET /api/vehicles
 *   ← GET /api/vehicles 200 42ms
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  const method = req.method;
  const path = req.originalUrl || req.url;

  console.log(`→ ${method} ${path}`);

  res.on("finish", () => {
    const duration = formatDuration(Date.now() - startedAt);
    console.log(`← ${method} ${path} ${res.statusCode} ${duration}`);
  });

  next();
}
