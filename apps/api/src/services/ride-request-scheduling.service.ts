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

export function getAddisDayBounds(now = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(now);
  return {
    start: new Date(`${date}T00:00:00+03:00`),
    end: new Date(`${date}T24:00:00+03:00`),
  };
}

/** Derive a blocking time window for schedule overlap checks. */
export function getRideScheduleWindow(input: RideScheduleInput): RideScheduleWindow {
  const now = input.now ?? new Date();

  if (input.status === "in_progress") {
    const start = input.scheduledAt && input.scheduledAt.getTime() < now.getTime()
      ? input.scheduledAt
      : now;
    const expectedEnd = getRideExpectedEndAt({
      scheduledAt: input.scheduledAt,
      scheduledReturnAt: input.scheduledReturnAt,
    });
    const end =
      expectedEnd && expectedEnd.getTime() > now.getTime()
        ? expectedEnd
        : new Date(now.getTime() + DEFAULT_BUSY_BLOCK_MS);
    return { start, end };
  }

  if (input.scheduledAt) {
    const start = input.scheduledAt;
    const expectedEnd = getRideExpectedEndAt({
      scheduledAt: input.scheduledAt,
      scheduledReturnAt: input.scheduledReturnAt,
    });
    const end =
      expectedEnd && expectedEnd.getTime() >= start.getTime()
        ? expectedEnd
        : start;
    return { start, end };
  }

  const end =
    input.scheduledReturnAt && input.scheduledReturnAt.getTime() > now.getTime()
      ? input.scheduledReturnAt
      : new Date(now.getTime() + DEFAULT_BUSY_BLOCK_MS);

  return { start: now, end };
}

/** When an in-progress trip should be treated as finished if the driver never closed it. */
export function getRideExpectedEndAt(input: {
  scheduledAt: Date | null;
  scheduledReturnAt: Date | null;
  startedAt?: Date | null;
}): Date | null {
  if (input.scheduledReturnAt) {
    return input.scheduledReturnAt;
  }

  const anchor = input.scheduledAt ?? input.startedAt ?? null;
  if (anchor) {
    return getAddisDayBounds(anchor).end;
  }

  if (input.startedAt) {
    return new Date(input.startedAt.getTime() + DEFAULT_BUSY_BLOCK_MS);
  }

  return null;
}

export function rideScheduleWindowsOverlap(a: RideScheduleWindow, b: RideScheduleWindow) {
  return a.start.getTime() <= b.end.getTime() && b.start.getTime() <= a.end.getTime();
}
