export type RoleName = "Admin" | "Formador" | "Formando";

export interface Profile {
  id: string;
  full_name: string;
  nif: string;
  email: string;
}

export interface UserRole {
  user_id: string;
  role_name: RoleName;
}

export interface RoutePermission {
  role_name: RoleName;
  route_path: string;
  is_granted: boolean;
}

export interface ComponentPermission {
  role_name: RoleName;
  page_path: string;
  component_id: string;
  is_granted: boolean;
}

export interface PageComponent {
  id: string;
  label: string;
}

export type TrainingCategory = "FTC" | "FTP" | "SU" | "SF";
export type TrainingStatus = "open" | "scheduled" | "closed";

export interface TrainingAction {
  id: string;
  category: TrainingCategory;
  title: string;
  status: TrainingStatus;
}

export type EnrollmentStatus = "pending" | "approved" | "completed";

export interface Enrollment {
  user_id: string;
  action_id: string;
  status: EnrollmentStatus;
}

export interface AppRoute {
  path: string;
  label: string;
  icon?: string;
}
