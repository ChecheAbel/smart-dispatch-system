import type { DriverAttendance, DriverAttendancePerson } from "@smart-dispatch/types";
import { formatWorkDate } from "../utils/validation";

type AttendanceRecord = {
  id: string;
  driverUserId: string;
  workDate: Date;
  status: DriverAttendance["status"];
  checkInAt: Date | null;
  checkOutAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  recordedBy?: {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
  } | null;
};

type DriverRecord = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  mobileNumber: string;
  assignedVehicle?: {
    id: string;
    plateNumber: string;
    make: string | null;
    model: string | null;
  } | null;
};

function formatPersonName(person: {
  firstName: string;
  middleName: string | null;
  lastName: string;
}) {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
}

export function toPublicDriverAttendance(record: AttendanceRecord): DriverAttendance {
  return {
    id: record.id,
    driver_user_id: record.driverUserId,
    work_date: formatWorkDate(record.workDate),
    status: record.status,
    check_in_at: record.checkInAt?.toISOString() ?? null,
    check_out_at: record.checkOutAt?.toISOString() ?? null,
    notes: record.notes,
    recorded_by: record.recordedBy
      ? { id: record.recordedBy.id, name: formatPersonName(record.recordedBy) }
      : null,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  };
}

export function toPublicAttendanceDriver(driver: DriverRecord): DriverAttendancePerson {
  return {
    id: driver.id,
    name: formatPersonName(driver),
    email: driver.email,
    mobile_number: driver.mobileNumber,
    assigned_vehicle: driver.assignedVehicle
      ? {
          id: driver.assignedVehicle.id,
          plate_number: driver.assignedVehicle.plateNumber,
          make: driver.assignedVehicle.make,
          model: driver.assignedVehicle.model,
        }
      : null,
  };
}
