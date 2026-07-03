import type { PaginationMeta } from "@smart-dispatch/types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export type PaginationParams = {
  page: number;
  limit: number;
  skip: number;
};

export function parsePaginationQuery(
  query: Record<string, unknown>,
  defaults?: { page?: number; limit?: number },
): PaginationParams {
  const page = parsePositiveInt(query.page, defaults?.page ?? DEFAULT_PAGE, 1);
  const limit = Math.min(
    MAX_LIMIT,
    parsePositiveInt(query.limit, defaults?.limit ?? DEFAULT_LIMIT, 1),
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const total_pages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    total_pages,
    has_next: total_pages > 0 && page < total_pages,
    has_prev: page > 1 && total > 0,
  };
}

export async function paginate<T>(
  pagination: PaginationParams,
  count: () => Promise<number>,
  findMany: (skip: number, take: number) => Promise<T[]>,
) {
  const [total, data] = await Promise.all([
    count(),
    findMany(pagination.skip, pagination.limit),
  ]);

  return {
    data,
    pagination: buildPaginationMeta(pagination.page, pagination.limit, total),
  };
}

function parsePositiveInt(value: unknown, fallback: number, min: number) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }
  return parsed;
}
