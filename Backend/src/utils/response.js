/**
 * Standardised API response helpers
 *
 * Every controller must use these instead of calling res.json() directly.
 * This guarantees a consistent envelope across all endpoints:
 *
 *   { success, message, data?, meta?, timestamp }
 */

/** 200 — successful operation */
const success = (res, data = null, message = "Success", statusCode = 200) =>
  res.status(statusCode).json({
    success: true,
    message,
    ...(data !== null && { data }),
    timestamp: new Date().toISOString(),
  });

/** 201 — resource created */
const created = (res, data = null, message = "Created successfully") =>
  success(res, data, message, 201);

/**
 * 200 — paginated list
 * @param {object} meta - { total, page, limit }
 */
const paginated = (res, data, meta, message = "Success") =>
  res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      total: meta.total,
      page: meta.page,
      limit: meta.limit,
      totalPages: Math.ceil(meta.total / meta.limit),
    },
    timestamp: new Date().toISOString(),
  });

/** 204 — no content (e.g. successful DELETE) */
const noContent = (res) => res.status(204).end();

module.exports = { success, created, paginated, noContent };
