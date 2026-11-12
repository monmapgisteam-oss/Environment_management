import dataStore from '@/lib/db';
import { definePublicView, notFound } from '../define';

// Public card opened from the QR code on printed evaluations and covers: name,
// role and workplace, enough to confirm who signed. Anyone can open it (the
// evaluated company included), so no contact details are shown: not the
// phone, not the email; of the signature PIN only whether one is registered.
async function fetchQrProfile(id: string) {
  const profile = await dataStore.user.findFirst({
    where: {
      id,
      role: { in: ['review_manager', 'evaluator'] },
    },
    select: {
      name: true,
      role: true,
      position: true,
      isActive: true,
      signaturePinHash: true,
      company: { select: { name: true } },
    },
  });
  if (!profile) return null;
  const { signaturePinHash, ...publicProfile } = profile;
  return { ...publicProfile, signatureRegistered: !!signaturePinHash };
}

export default definePublicView({
  name: 'qr/profile/:id',
  async load({ params }) {
    const profile = await fetchQrProfile(params.id);
    if (!profile) notFound();
    return {
      name: profile.name,
      role: profile.role,
      position: profile.position,
      isActive: profile.isActive,
      company: profile.company ? { name: profile.company.name } : null,
      signatureRegistered: profile.signatureRegistered,
    };
  },
});
