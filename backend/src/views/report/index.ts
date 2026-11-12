import type { ViewDefinition } from '../define';
import cover from './cover';
import detail from './detail';
import profile from './profile';
import qrProfile from './qrProfile';

// Page views of the report area (and the profile and public QR pages).
export const reportViews: ViewDefinition<any>[] = [detail, cover, profile, qrProfile];
