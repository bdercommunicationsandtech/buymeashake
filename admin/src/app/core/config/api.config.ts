import { environment } from './environment';

/** Single source of truth for API base URL (includes /api/v1). */
export const API_BASE_URL = environment.apiBaseUrl;

export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  useMock: environment.useMock,
} as const;

/** Auth + stubs for unused Buyer1 panels (not routed in BMS admin yet). */
export const API_ENDPOINTS = {
  auth: {
    adminLogin: '/admin/login',
    me: '/admin/me',
  },
  admin: {
    users: '/admin/users',
    banners: '/admin/banners',
    listingsSell: '/admin/listings/seller',
    listingsBuy: '/admin/listings/buyer',
    stats: '/admin/stats',
    trustReports: '/admin/trust/reports',
    contact: '/contact',
  },
} as const;
