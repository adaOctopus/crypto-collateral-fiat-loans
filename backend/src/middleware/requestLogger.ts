import { Request, Response, NextFunction } from 'express';

/**
 * Log every incoming request so we can see when the backend is hit.
 * Helps debug "no backend logs" and empty MongoDB (requests not arriving vs validation failing).
 */
export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  const method = req.method;
  const path = req.originalUrl || req.url;
  const hasBody = req.body && Object.keys(req.body).length > 0;
  console.log(`[API] ${method} ${path}${hasBody ? ' (body present)' : ''}`);
  if (hasBody && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    // Log a short summary so we see payload without dumping huge objects
    const keys = Object.keys(req.body);
    const summary = keys.reduce((acc, k) => {
      const v = req.body[k];
      if (v instanceof Date) acc[k] = v.toISOString();
      else if (typeof v === 'object' && v !== null) acc[k] = '[object]';
      else acc[k] = v;
      return acc;
    }, {} as Record<string, unknown>);
    console.log('[API] body keys:', keys.join(', '), '| sample:', JSON.stringify(summary).slice(0, 200));
  }
  next();
}
