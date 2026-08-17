import { Prisma } from "@prisma/client";
import { PaginationQuery } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

export function parsePagination(query: Record<string, unknown>): PaginationQuery {
  const page = Math.max(1, Number(query.page ?? DEFAULT_PAGE) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(query.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT),
  );
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): Prisma.JsonObject {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
