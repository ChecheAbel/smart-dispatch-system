import {
  findPendingDriverApplicationById,
} from "../models/driver-application.model";
import { updateUserAccountActivation, updateUserAccountStatus } from "../models/user.model";

export class DriverApplicationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DriverApplicationError";
    this.status = status;
  }
}

export async function approveDriverApplication(userId: string) {
  const application = await findPendingDriverApplicationById(userId);
  if (!application) {
    throw new DriverApplicationError("Driver application not found or already processed.", 404);
  }

  const user = await updateUserAccountActivation(userId, "activated");
  return user;
}

export async function rejectDriverApplication(userId: string) {
  const application = await findPendingDriverApplicationById(userId);
  if (!application) {
    throw new DriverApplicationError("Driver application not found or already processed.", 404);
  }

  const user = await updateUserAccountStatus(userId, "deactivated");
  return user;
}
