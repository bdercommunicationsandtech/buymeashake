/** Modelos para Tickets de Mesa de Ayuda y Soporte (Helpdesk) */

export interface ContactTicket {
  id: number;
  folio: string;
  name: string;
  full_name: string;
  email: string;
  mail: string;
  user_role: string;
  category: string;
  category_title: string;
  subject: string;
  description: string;
  message: string;
  related_folio_or_handle?: string | null;
  attached_file?: string | null;
  images?: string[] | null;
  date: string;
  created_at: string;
  read: boolean;
  is_read: boolean;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | string;
  assigned_admin_id?: number | null;
  assigned_admin_name?: string | null;
  admin_notes?: string | null;
  reply_message?: string | null;
  replied_at?: string | null;
  total?: number | null;
  read_count?: number | null;
  unread_count?: number | null;
}

export interface ContactTicketListParams {
  last_id?: number;
  limit?: number;
  read_filter?: string;
  status_filter?: string;
  role_filter?: string;
  category_filter?: string;
  search?: string;
}

export interface ContactTicketListResponse {
  code?: number;
  message?: string;
  result: ContactTicket[];
  total?: number;
  read_count?: number;
  unread_count?: number;
}

export interface ContactTicketReplyPayload {
  reply_message: string;
  admin_notes?: string;
}

export interface ContactTicketStatusPayload {
  status: string;
  admin_notes?: string;
}

export type ContactReadFilter = '' | 'unread' | 'read';

export const CONTACT_READ_FILTER_OPTIONS: {
  value: ContactReadFilter;
  label: string;
}[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'unread', label: 'No leídos (Nuevos)' },
  { value: 'read', label: 'Leídos' },
];

export type ContactStatusFilter = '' | 'open' | 'in_progress' | 'resolved' | 'closed';

export const CONTACT_STATUS_FILTER_OPTIONS: {
  value: ContactStatusFilter;
  label: string;
}[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'open', label: 'Abierto' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'resolved', label: 'Resuelto' },
  { value: 'closed', label: 'Cerrado' },
];
