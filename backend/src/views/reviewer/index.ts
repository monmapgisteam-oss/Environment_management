import type { ViewDefinition } from '../define';
import assign from './assign';
import conclusions from './conclusions';
import dashboard from './dashboard';
import evaluate from './evaluate';
import evaluationProgress from './evaluationProgress';
import geography from './geography';
import reports from './reports';
import returned from './returned';
import staff from './staff';

// Page views of the reviewer area (the review manager's portal).
export const reviewerViews: ViewDefinition<any>[] = [
  dashboard,
  reports,
  returned,
  assign,
  evaluate,
  evaluationProgress,
  staff,
  conclusions,
  geography,
];
