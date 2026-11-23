import type { Role } from '../types/user';

/** RMAs use the RMA portal; every stakeholder role (BM, Head of Retail, Risk, Management) uses the stakeholder portal. */
export const homePath = (role: Role): string => (role === 'RMA' ? '/rma/dashboard' : '/management/dashboard');
export const SIGN_IN_PATH = '/sign-in';
export const SIGN_UP_PATH = '/sign-up';
