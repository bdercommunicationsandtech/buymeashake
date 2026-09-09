/** Modelo para el Módulo de Reportes de Cumplimiento y Moderación (Trust & Safety) de Buy me a Shake */

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed' | string;

export type ReportPriority = 'low' | 'medium' | 'high' | 'critical' | string;

export interface TrustReport {
  id: number;
  folio: string;
  creator_target: string;
  athlete_id?: number | null;
  athlete_handle?: string | null;
  athlete_name?: string | null;
  athlete_avatar?: string | null;
  reporter_email: string;
  reason_code: string;
  reason_title: string;
  description: string;
  evidence_links?: string[] | null;
  attached_file?: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  assigned_moderator_id?: number | null;
  assigned_moderator_name?: string | null;
  verdict?: string | null;
  verdict_title?: string | null;
  admin_notes?: string | null;
  action_details?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface TrustReportListParams {
  status_filter?: string;
  priority_filter?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TrustReportListResponse {
  message?: string;
  result: TrustReport[];
  total?: number;
  pending_count?: number;
}

export interface TrustReportStatusUpdatePayload {
  status: string;
  priority?: string;
  admin_notes?: string;
}

export interface AdminReportVerdictPayload {
  reporter_email?: string;
  creator_target?: string;
  verdict: 'action_taken' | 'dismissed' | 'warning';
  verdict_title: string;
  admin_notes: string;
  action_details?: string;
}

export interface AdminReportVerdictResponse {
  folio: string;
  verdict: string;
  status: string;
  email_sent: boolean;
  message: string;
}

export const REPORT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'under_review', label: 'En revisión' },
  { value: 'resolved', label: 'Resuelto' },
  { value: 'dismissed', label: 'Descartado' },
];

export const REPORT_PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todas las prioridades' },
  { value: 'critical', label: 'Crítica' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Media' },
  { value: 'low', label: 'Baja' },
];

export const REASON_CODE_LABELS: Record<string, string> = {
  doping: 'Dopaje y sustancias prohibidas',
  medical_risk: 'Intrusismo o riesgo para la salud',
  impersonation: 'Suplantación de identidad',
  scam_fraud: 'Fraude o engaño económico',
  fraud: 'Fraude o engaño económico',
  harassment: 'Acoso o intimidación',
  hate_speech: 'Discurso de odio',
  unfulfilled_order: 'Servicio / asesoría no cumplida',
  ip_theft: 'Plagio de rutinas o guías',
  copyright: 'Infracción de derechos de autor',
  inappropriate: 'Contenido sexual o no apto',
  nsfw: 'Contenido NSFW sin etiqueta',
  spam: 'Spam o enlaces masivos',
  other: 'Otro motivo',
};

export const VERDICT_OPTIONS: {
  value: 'action_taken' | 'warning' | 'dismissed';
  label: string;
  description: string;
  tone: 'rose' | 'amber' | 'slate';
}[] = [
  {
    value: 'action_taken',
    label: 'Acción Tomada / Sanción',
    description: 'Se constató la falta y se aplicaron medidas correctivas o disciplinarias.',
    tone: 'rose',
  },
  {
    value: 'warning',
    label: 'Advertencia Oficial',
    description: 'Se notificó formalmente al creador sobre las normas de la comunidad.',
    tone: 'amber',
  },
  {
    value: 'dismissed',
    label: 'Desestimar Reporte',
    description: 'No se encontraron evidencias suficientes o la denuncia no procede.',
    tone: 'slate',
  },
];
