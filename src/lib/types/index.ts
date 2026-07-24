// ============================================================
// BYD Simone RRHH · Tipos TypeScript globales
// ============================================================

export type UserRole = 'collaborator' | 'leader' | 'manager' | 'hr_admin'
export type ProfileStatus = 'active' | 'inactive' | 'on_leave'
export type Sucursal = 'la_plata' | 'mar_del_plata' | 'brandsen'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'needs_info'
export type OvertimeStatus = 'pending_validation' | 'validated' | 'rejected' | 'credited'
export type OvertimeCompStatus = 'pending' | 'approved' | 'rejected'
export type NotificationType =
  | 'new_request' | 'request_approved' | 'request_rejected' | 'request_needs_info'
  | 'overtime_credited' | 'overtime_validated' | 'overtime_rejected'
  | 'compensation_approved' | 'compensation_rejected'
  | 'balance_low' | 'balance_expiring' | 'certificate_required'
  | 'birthday_reminder' | 'approval_timeout' | 'limit_exceeded_warning'

// ── Etiquetas UI ──────────────────────────────────────────
export const ROLE_LABELS: Record<UserRole, string> = {
  collaborator: 'Colaborador',
  leader:       'Líder',
  manager:      'Gerente',
  hr_admin:     'RRHH / Admin',
}

export const SUCURSAL_LABELS: Record<Sucursal, string> = {
  la_plata:     'La Plata',
  mar_del_plata: 'Mar del Plata',
  brandsen:     'Brandsen',
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending:    'Pendiente',
  approved:   'Aprobada',
  rejected:   'Rechazada',
  cancelled:  'Cancelada',
  needs_info: 'Info requerida',
}

export const OT_STATUS_LABELS: Record<OvertimeStatus, string> = {
  pending_validation: 'Pendiente',
  validated:          'Validada',
  rejected:           'Rechazada',
  credited:           'Acreditada',
}

// ── Modelos de BD ─────────────────────────────────────────

export interface Area {
  id:          string
  name:        string
  description: string | null
  color:       string
  is_sales:    boolean
  is_active:   boolean
  created_at:  string
  updated_at:  string
}

export interface Profile {
  id:             string
  employee_code:  string | null
  full_name:      string
  dni:            string | null
  birth_date:     string | null
  hire_date:      string
  position:       string | null
  area_id:        string | null
  leader_id:      string | null
  role:           UserRole
  avatar_url:     string | null
  phone:          string | null
  status:         ProfileStatus
  sucursal:       Sucursal | null
  notes:          string | null
  deleted_at:     string | null
  created_at:     string
  updated_at:     string
  // Relations (joined)
  area?:          Area
  leader?:        Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export interface BenefitType {
  id:                   string
  code:                 string
  name:                 string
  description:          string | null
  color:                string
  icon:                 string | null
  requires_certificate: boolean
  needs_approval:       boolean
  max_days_per_year:    number | null
  expiry_months:        number | null
  applies_to_sales_only: boolean
  allow_half_day:       boolean
  is_active:            boolean
  sort_order:           number
}

export interface BenefitBalance {
  id:              string
  employee_id:     string
  benefit_type_id: string
  year:            number
  total_granted:   number
  used:            number
  pending:         number
  available:       number
  expires_at:      string | null
  notes:           string | null
  // Relations
  benefit_type?:   BenefitType
  employee?:       Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export interface Request {
  id:               string
  employee_id:      string
  benefit_type_id:  string
  start_date:       string
  end_date:         string
  days_count:       number | null
  is_half_day:      boolean
  half_day_period:  'morning' | 'afternoon' | null
  status:           RequestStatus
  reason:           string | null
  reviewer_id:      string | null
  reviewer_comment: string | null
  reviewed_at:      string | null
  resubmitted_from: string | null
  created_at:       string
  updated_at:       string
  // Relations
  employee?:        Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'area_id' | 'area'>
  benefit_type?:    BenefitType
  reviewer?:        Pick<Profile, 'id' | 'full_name'>
  medical_certificates?: MedicalCertificate[]
}

export interface MedicalCertificate {
  id:           string
  request_id:   string
  employee_id:  string
  file_path:    string
  file_name:    string
  file_type:    string
  file_size:    number | null
  valid_from:   string
  valid_until:  string | null
  observations: string | null
  uploaded_at:  string
}

export interface OvertimeRecord {
  id:                     string
  employee_id:            string
  work_date:              string
  start_time:             string
  end_time:               string
  total_hours:            number | null
  hours_50pct:            number
  hours_100pct:           number
  night_hours:            number
  exceeds_daily_limit:    boolean
  exceeds_monthly_limit:  boolean
  exceeds_annual_limit:   boolean
  reason:                 string
  authorized_by:          string | null
  status:                 OvertimeStatus
  validator_id:           string | null
  validator_comment:      string | null
  validated_at:           string | null
  expires_at:             string | null
  document_url:           string | null
  created_at:             string
  // Relations
  employee?:              Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'area_id' | 'area'>
  authorizer?:            Pick<Profile, 'id' | 'full_name'>
  validator?:             Pick<Profile, 'id' | 'full_name'>
}

export interface OvertimeBalance {
  employee_id:      string
  total_hours:      number
  used_hours:       number
  pending_hours:    number
  available_hours:  number
  updated_at:       string
}

export interface OvertimeCompensation {
  id:               string
  employee_id:      string
  start_date:       string
  end_date:         string
  hours_requested:  number
  status:           OvertimeCompStatus
  reviewer_id:      string | null
  reviewer_comment: string | null
  reviewed_at:      string | null
  reason:           string | null
  created_at:       string
  // Relations
  employee?:        Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
  reviewer?:        Pick<Profile, 'id' | 'full_name'>
}

export interface Notification {
  id:           string
  recipient_id: string
  type:         NotificationType
  title:        string
  body:         string
  link:         string | null
  metadata:     Record<string, unknown> | null
  read_at:      string | null
  created_at:   string
}

export interface AuditLog {
  id:         number
  user_id:    string | null
  user_name:  string | null
  action:     string
  table_name: string | null
  record_id:  string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface Holiday {
  id:          string
  date:        string
  name:        string
  year:        number
  is_optional: boolean
  created_at:  string
}

export interface SystemSetting {
  key:         string
  value:       unknown
  description: string | null
  updated_at:  string
}

// ── Tipos de formulario ───────────────────────────────────

export interface CreateUserForm {
  full_name:     string
  email:         string
  password:      string
  employee_code: string
  dni:           string
  birth_date:    string
  hire_date:     string
  position:      string
  area_id:       string
  leader_id:     string
  role:          UserRole
  sucursal:      Sucursal
  phone:         string
  notes:         string
}

export interface CreateRequestForm {
  benefit_type_id: string
  start_date:      string
  end_date:        string
  is_half_day:     boolean
  half_day_period: 'morning' | 'afternoon' | ''
  reason:          string
}

export interface CreateOvertimeForm {
  work_date:     string
  start_time:    string
  end_time:      string
  reason:        string
  authorized_by: string
}

// ── Vistas de dashboard ───────────────────────────────────

export interface DashboardStats {
  absent_today:         number
  on_vacation:          number
  sick_leave:           number
  pending_requests:     number
  simone_days_used:     number
  simone_days_available: number
  overtime_pending_hours: number
  overtime_credited_hours: number
  upcoming_birthdays:   UpcomingBirthday[]
  absences_by_type:     { type: string; count: number; color: string }[]
  monthly_evolution:    { month: string; absences: number }[]
}

export interface UpcomingBirthday {
  id:            string
  full_name:     string
  avatar_url:    string | null
  next_birthday: string
  area_name:     string
}

export interface TodayAbsence {
  request_id:   string
  employee_id:  string
  full_name:    string
  avatar_url:   string | null
  area_name:    string
  area_color:   string
  benefit_name: string
  benefit_color: string
  benefit_code: string
  start_date:   string
  end_date:     string
}

// ── Utilidades ────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc'

export interface PaginatedResponse<T> {
  data:  T[]
  count: number
  page:  number
  limit: number
}

export interface ApiError {
  message: string
  code?:   string
}
