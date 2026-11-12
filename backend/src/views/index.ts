import type { ViewDefinition } from './define';
import shell from './shell';
import { adminViews } from './admin';
import { evaluatorViews } from './evaluator';
import { reportViews } from './report';
import { reviewerViews } from './reviewer';
import { senderViews } from './sender';

// Every page view the backend serves under /api/views/<name>.
export const views: ViewDefinition<any>[] = [
  shell,
  ...senderViews,
  ...reviewerViews,
  ...evaluatorViews,
  ...adminViews,
  ...reportViews,
];
