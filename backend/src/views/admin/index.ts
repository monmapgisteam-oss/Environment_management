import type { ViewDefinition } from '../define';
import companies from './companies';
import criteria from './criteria';
import dashboard from './dashboard';
import feedback from './feedback';
import map from './map';
import notifications from './notifications';
import settings from './settings';
import users from './users';

// Page views of the admin area.
export const adminViews: ViewDefinition<any>[] = [dashboard, companies, criteria, feedback, map, notifications, settings, users];
