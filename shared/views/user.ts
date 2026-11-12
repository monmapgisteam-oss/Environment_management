import type { Company, User } from '@shared/db/models';

// The signed-in user as the frontend sees it: no password or PIN hash.
export type PublicUser = Omit<User, 'password' | 'signaturePinHash'> & {
  company: Company | null;
  hasSignaturePin: boolean;
};
