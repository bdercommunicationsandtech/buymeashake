/** Mirror of services trust_reports / TrustReportOut */

export type ReportStatus = 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export type ReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TargetEntityType =
  | 'BUYER_PRODUCT'
  | 'SELLER_PRODUCT'
  | 'USER'
  | 'OFFER'
  | 'CHAT';

export interface TrustReport {
  id: number;
  reporter_user_id: number;
  target_type: TargetEntityType;
  target_id: number;
  reason_category: string;
  subject: string;
  message: string;
  status: ReportStatus;
  priority: ReportPriority;
  duplicate_of?: number | null;
  assigned_moderator_id?: number | null;
  resolution_action?: string | null;
  resolution_notes?: string | null;
  evidence_images?: string[] | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface TrustReportListParams {
  status_filter?: ReportStatus | '';
  priority_filter?: ReportPriority | '';
  assigned_moderator_id?: number;
  limit?: number;
  offset?: number;
}

export interface TrustReportListResponse {
  code?: number;
  message?: string;
  result: TrustReport[];
  total?: number | null;
}

export interface TrustReportStatusUpdatePayload {
  status: ReportStatus;
  resolution_action?: string;
  resolution_notes?: string;
  duplicate_of?: number;
}

export interface TrustReportMutationResponse {
  code?: number;
  message?: string;
  result: TrustReport[];
}

export const REPORT_STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'UNDER_REVIEW', label: 'En revisión' },
  { value: 'RESOLVED', label: 'Resuelto' },
  { value: 'DISMISSED', label: 'Descartado' },
];

export const REPORT_PRIORITY_OPTIONS: { value: ReportPriority; label: string }[] = [
  { value: 'CRITICAL', label: 'Crítica' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'LOW', label: 'Baja' },
];

export const TARGET_TYPE_LABELS: Record<TargetEntityType, string> = {
  BUYER_PRODUCT: 'Producto (compra)',
  SELLER_PRODUCT: 'Producto (venta)',
  USER: 'Usuario',
  OFFER: 'Oferta',
  CHAT: 'Chat',
};

export const REASON_CATEGORY_LABELS: Record<string, string> = {
  SPAM: 'Spam o publicidad',
  FRAUD: 'Sospecha de fraude',
  INAPPROPRIATE_CONTENT: 'Contenido inapropiado',
  OFFENSIVE_BEHAVIOR: 'Comportamiento ofensivo',
  OTHER: 'Otro motivo',
};

export const RESOLUTION_ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'NO_VIOLATION', label: 'Sin infracción' },
  { value: 'WARNING', label: 'Advertencia' },
  { value: 'STRIKE', label: 'Strike' },
  { value: 'LISTING_REMOVED', label: 'Publicación retirada' },
  { value: 'TEMP_SUSPENSION', label: 'Suspensión temporal' },
  { value: 'PERMANENT_BAN', label: 'Suspensión permanente' },
  { value: 'DUPLICATE', label: 'Duplicado' },
];

/** FSM transitions allowed by moderation_service */
export const ALLOWED_STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  PENDING: ['UNDER_REVIEW', 'DISMISSED', 'RESOLVED'],
  UNDER_REVIEW: ['RESOLVED', 'DISMISSED'],
  RESOLVED: [],
  DISMISSED: [],
};
