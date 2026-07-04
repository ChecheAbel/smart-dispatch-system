import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { apiReference } from "@scalar/express-api-reference";
import { openApiSpec } from "./docs/openapi";
import { migrate } from "./db/migrate";
import { registerAuthRoleRoutes } from "./routes/auth-role.routes";
import { registerAuthRoutes } from "./routes/auth.routes";
import { registerMenuRoutes } from "./routes/menu.routes";
import { registerPermissionRoutes } from "./routes/permission.routes";
import { registerRoleRoutes } from "./routes/role.routes";
import { registerUserRoutes } from "./routes/user.routes";
import { sendSuccess } from "./utils/response";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

registerAuthRoutes(app);
registerUserRoutes(app);
registerRoleRoutes(app);
registerAuthRoleRoutes(app);
registerPermissionRoutes(app);
registerMenuRoutes(app);

app.get("/api/health", (_req, res) => {
  sendSuccess(res, { status: "ok" }, { message: "Smart Dispatch System API is running" });
});

app.use(
  "/api/docs",
  apiReference({
    theme: "default",
    spec: {
      content: openApiSpec,
    },
  }),
);

async function start() {
  await migrate();
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start API server:", error);
  process.exit(1);
});
