/** Mirror of services ContactOut / contacts table */

export interface ContactTicket {
  id: number;
  full_name: string;
  mail: string;
  subject: string;
  message: string;
  images?: string[] | null;
  date: string;
  read: boolean;
  total?: number | null;
  read_count?: number | null;
}

export interface ContactTicketListParams {
  last_id?: number;
  limit?: number;
}

export interface ContactTicketListResponse {
  code?: number;
  message?: string;
  result: ContactTicket[];
}

export type ContactReadFilter = '' | 'unread' | 'read';

export const CONTACT_READ_FILTER_OPTIONS: {
  value: ContactReadFilter;
  label: string;
}[] = [
  { value: '', label: 'Todos' },
  { value: 'unread', label: 'No leídos' },
  { value: 'read', label: 'Leídos' },
];
