import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { apiReference } from "@scalar/express-api-reference";
import { openApiSpec } from "./docs/openapi";
import { migrate } from "./db/migrate";
import { registerAuditLogRoutes } from "./routes/audit-log.routes";
import { registerAuthRoleRoutes } from "./routes/auth-role.routes";
import { registerAuthRoutes } from "./routes/auth.routes";
import { registerMenuRoutes } from "./routes/menu.routes";
import { registerNotificationRoutes } from "./routes/notification.routes";
import { registerNotificationDeliveryLogRoutes } from "./routes/notification-delivery-log.routes";
import { registerSystemSettingsRoutes } from "./routes/system-settings.routes";
import { registerPermissionRoutes } from "./routes/permission.routes";
import { registerRoleRoutes } from "./routes/role.routes";
import { registerUserRoutes } from "./routes/user.routes";
import { registerLocationRoutes } from "./routes/location.routes";
import { registerRegionRoutes } from "./routes/region.routes";
import { registerVehicleRoutes } from "./routes/vehicle.routes";
import { registerVehicleTypeRoutes } from "./routes/vehicle-type.routes";
import { registerVehicleClassRoutes } from "./routes/vehicle-class.routes";
import { registerMaintenanceWorkTypeRoutes } from "./routes/maintenance-work-type.routes";
import { registerFarePlanRoutes } from "./routes/fare-plan.routes";
import { registerContractRoutes } from "./routes/contract.routes";
import { registerInvoiceRoutes } from "./routes/invoice.routes";
import { registerCustomerBillingRoutes } from "./routes/customer-billing.routes";
import { registerRideRequestRoutes } from "./routes/ride-request.routes";
import { registerAdminRideRequestRoutes } from "./routes/admin-ride-request.routes";
import { registerAdminDashboardRoutes } from "./routes/dashboard.routes";
import { registerDriverUpcomingTripsSocket } from "./websocket/driver-upcoming-trips.socket";
import { startInvoiceAutomationScheduler } from "./services/scheduler.service";
import { requestLogger } from "./middleware/request-logger";
import { ensureDriverLicenseUploadDir, getDriverLicenseUploadDir } from "./utils/driver-license-upload";
import { ensureVehicleUploadDir, getVehicleUploadDir } from "./utils/vehicle-photo-upload";
import { loadAppSettings } from "./models/app-setting.model";
import { sendSuccess } from "./utils/response";

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4000;

app.use(cors());
app.use(requestLogger);
app.use(express.json());
ensureDriverLicenseUploadDir();
app.use("/uploads/driver-licenses", express.static(getDriverLicenseUploadDir()));
ensureVehicleUploadDir();
app.use("/uploads/vehicles", express.static(getVehicleUploadDir()));

registerAuthRoutes(app);
registerUserRoutes(app);
registerRoleRoutes(app);
registerAuthRoleRoutes(app);
registerPermissionRoutes(app);
registerMenuRoutes(app);
registerNotificationRoutes(app);
registerNotificationDeliveryLogRoutes(app);
registerAuditLogRoutes(app);
registerVehicleTypeRoutes(app);
registerVehicleClassRoutes(app);
registerMaintenanceWorkTypeRoutes(app);
registerVehicleRoutes(app);
registerRegionRoutes(app);
registerLocationRoutes(app);
registerFarePlanRoutes(app);
registerContractRoutes(app);
registerInvoiceRoutes(app);
registerCustomerBillingRoutes(app);
registerRideRequestRoutes(app);
registerAdminRideRequestRoutes(app);
registerSystemSettingsRoutes(app);
registerAdminDashboardRoutes(app);
registerDriverUpcomingTripsSocket(server);

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
  await loadAppSettings();
  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    startInvoiceAutomationScheduler();
  });
}

start().catch((error) => {
  console.error("Failed to start API server:", error);
  process.exit(1);
});
