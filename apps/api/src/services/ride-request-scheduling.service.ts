export type RideScheduleWindow = {
  start: Date;
  end: Date;
};

const DEFAULT_BUSY_BLOCK_MS = 8 * 60 * 60 * 1000;

type RideScheduleInput = {
  scheduledAt: Date | null;
  scheduledReturnAt: Date | null;
  status?: string;
  now?: Date;
};

/** Derive a blocking time window for schedule overlap checks. */
export function getRideScheduleWindow(input: RideScheduleInput): RideScheduleWindow {
  const now = input.now ?? new Date();

  if (input.scheduledAt) {
    const start = input.scheduledAt;
    const end =
      input.scheduledReturnAt && input.scheduledReturnAt.getTime() >= start.getTime()
        ? input.scheduledReturnAt
        : start;
    return { start, end };
  }

  const end =
    input.scheduledReturnAt && input.scheduledReturnAt.getTime() > now.getTime()
      ? input.scheduledReturnAt
      : new Date(now.getTime() + DEFAULT_BUSY_BLOCK_MS);

  return { start: now, end };
}

export function rideScheduleWindowsOverlap(a: RideScheduleWindow, b: RideScheduleWindow) {
  return a.start.getTime() <= b.end.getTime() && b.start.getTime() <= a.end.getTime();
}
