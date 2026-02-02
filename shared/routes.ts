import { z } from "zod";

// The app primarily communicates directly with Supabase from the frontend.
// However, we need to export the 'api' object and 'buildUrl' for the codebase structure to be valid.

export const api = {
  // We can define health check or utility routes here if needed.
  health: {
    check: {
      method: "GET" as const,
      path: "/api/health",
      responses: {
        200: z.object({ status: z.literal("ok") }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
