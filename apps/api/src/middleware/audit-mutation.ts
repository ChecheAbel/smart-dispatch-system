import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./authenticate";
import { recordAuditFromRequest } from "../services/audit-log.service";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function auditMutations() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!MUTATION_METHODS.has(req.method)) {
      next();
      return;
    }

    res.on("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return;
      }

      void recordAuditFromRequest(req).catch((error) => {
        console.error("Failed to record audit log:", error);
      });
    });

    next();
  };
}
