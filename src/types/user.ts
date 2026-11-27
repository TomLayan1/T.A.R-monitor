/** Every account has exactly one role. For stakeholders the role IS the department. */
export type Role = 'RMA' | 'BM' | 'Head of Retail' | 'Risk' | 'Management';
export type AccountType = 'RMA' | 'Stakeholder';

/** Stakeholder departments offered at sign-up. Business Manager is a stakeholder department, not an account type. */
export const STAKEHOLDER_DEPARTMENTS: Array<{ value: Exclude<Role, 'RMA'>; label: string }> = [
  { value: 'Head of Retail', label: 'Head of Retail' },
  { value: 'BM', label: 'Business Manager (BM)' },
  { value: 'Risk', label: 'Risk' },
  { value: 'Management', label: 'Management' },
];

export const roleLabel = (role: Role): string => (role === 'BM' ? 'Business Manager' : role);
export const accountTypeFor = (role: Role): AccountType => (role === 'RMA' ? 'RMA' : 'Stakeholder');

export interface SessionUser {
  id: string;
  firstName: string;
  surname: string;
  email: string;
  role: Role;
  /** RMAs: the BM (user id) they report to. Others: null. */
  bmId: string | null;
  /** RMAs: regions chosen at sign-up. */
  regions: string[];
}

/** Demo-only: passwords are stored in plain text in LocalStorage. Never do this in production. */
export interface StoredUser extends SessionUser {
  password: string;
}

export const fullName = (u: { firstName: string; surname: string }) => `${u.firstName} ${u.surname}`.trim();
