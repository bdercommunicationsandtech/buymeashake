import { HttpInterceptorFn } from '@angular/common/http';
import { API_CONFIG } from '../config/api.config';

/**
 * Marks admin panel HTTP calls as web so the API can distinguish from mobile clients.
 */
export const buyer1ClientInterceptor: HttpInterceptorFn = (req, next) => {
  const base = (API_CONFIG.baseUrl || '').replace(/\/$/, '');
  if (!base || !req.url.startsWith(base)) {
    return next(req);
  }
  const headers: Record<string, string> = {};
  if (!req.headers.has('X-App-Platform')) {
    headers['X-App-Platform'] = 'web';
  }
  if (!req.headers.has('X-Buyer1-Client')) {
    headers['X-Buyer1-Client'] = 'web';
  }
  if (Object.keys(headers).length === 0) {
    return next(req);
  }
  return next(req.clone({ setHeaders: headers }));
};
