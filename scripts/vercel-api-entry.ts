import app from '../server';

export default function handler(req: any, res: any) {
  try {
    const rawUrl = String(req?.url || '/');
    const urlObj = new URL(rawUrl, 'http://localhost');
    const rewrittenPath = urlObj.searchParams.get('__ne_path');
    if (rewrittenPath !== null) {
      urlObj.searchParams.delete('__ne_path');
      const cleanSubpath = rewrittenPath.replace(/^\/+/, '');
      const qs = urlObj.searchParams.toString();
      req.url = `/api/${cleanSubpath}${qs ? `?${qs}` : ''}`;
    } else if (urlObj.pathname === '/api' || urlObj.pathname === '/api/index') {
      const originalHeader = String(
        req?.headers?.['x-vercel-original-url'] ||
          req?.headers?.['x-forwarded-uri'] ||
          req?.headers?.['x-rewrite-url'] ||
          ''
      ).trim();
      if (originalHeader.startsWith('/api/')) {
        req.url = originalHeader;
      }
    }
  } catch {
    // Mantém req.url original caso o parsing falhe
  }

  const expressApp: any = typeof app === 'function' ? app : (app as any)?.default || (app as any)?.app;
  return expressApp(req, res);
}
