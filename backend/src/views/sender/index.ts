import type { ViewDefinition } from '../define';
import conclusions from './conclusions';
import dashboard from './dashboard';
import drafts from './drafts';
import geography from './geography';
import registration from './registration';
import reports from './reports';
import revise from './revise';

// Page views of the sender area.
export const senderViews: ViewDefinition<any>[] = [dashboard, reports, drafts, conclusions, revise, geography, registration];
