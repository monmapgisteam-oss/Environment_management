import { createQrImageUrl, getPublicProfileQrUrl } from '@/lib/auth/profileQr';
import { defineView } from '../define';

// The signed-in user's profile page: the QR code to their public signer card,
// which only managers and staff have.
export default defineView({
  name: 'profile',
  roles: [],
  async load({ user }) {
    const showQrCode = user.role === 'review_manager' || user.role === 'evaluator';
    if (!showQrCode) return { qrUrl: null };
    const qrProfileUrl = await getPublicProfileQrUrl(user.id);
    return { qrUrl: await createQrImageUrl(qrProfileUrl) };
  },
});
