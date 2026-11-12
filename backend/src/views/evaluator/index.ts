import type { ViewDefinition } from '../define';
import conclusions from './conclusions';
import dashboard from './dashboard';
import evaluate from './evaluate';
import evaluated from './evaluated';
import geography from './geography';

// Page views of the evaluator area.
export const evaluatorViews: ViewDefinition<any>[] = [dashboard, evaluated, evaluate, conclusions, geography];
