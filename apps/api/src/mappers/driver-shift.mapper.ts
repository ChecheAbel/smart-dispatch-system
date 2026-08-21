import type { DriverShiftAssignment, DriverShiftTemplate } from "@smart-dispatch/types";
import { formatWorkDate } from "../utils/validation";
import { toPublicAttendanceDriver } from "./driver-attendance.mapper";

type ShiftTemplateRecord = {
  id: string;
  slug: string;
  name: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
  active: boolean;
};

type AssignmentRecord = {
  id: string;
  driverUserId: string;
  workDate: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  shiftTemplate: ShiftTemplateRecord;
  assignedBy?: {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
  } | null;
};

function formatPersonName(person: {
  firstName: string;
  middleName: string | null;
  lastName: string;
}) {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
}

export function toPublicShiftTemplate(template: ShiftTemplateRecord): DriverShiftTemplate {
  return {
    id: template.id,
    slug: template.slug,
    name: template.name,
    start_time: template.startTime,
    end_time: template.endTime,
    sort_order: template.sortOrder,
    active: template.active,
  };
}

export function toPublicShiftAssignment(record: AssignmentRecord): DriverShiftAssignment {
  return {
    id: record.id,
    driver_user_id: record.driverUserId,
    work_date: formatWorkDate(record.workDate),
    shift: toPublicShiftTemplate(record.shiftTemplate),
    notes: record.notes,
    assigned_by: record.assignedBy
      ? { id: record.assignedBy.id, name: formatPersonName(record.assignedBy) }
      : null,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  };
}

export { toPublicAttendanceDriver as toPublicShiftDriver };
