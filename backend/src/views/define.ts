import type { CurrentUser } from '@/lib/auth';
import type { Role } from '@shared/auth/roles';
import type { ViewName, Views } from '@shared/views';

// A page view: the data one frontend page renders, loaded for the signed-in
// user. The frontend never reads the database; it asks for its page's view.

export type ViewContext = {
  user: CurrentUser;
  // URL parameters of the view path (":id" segments).
  params: Record<string, string>;
  // The page's search parameters, passed through by the frontend.
  query: URLSearchParams;
};

export type ViewDefinition<K extends ViewName = ViewName> = {
  name: K;
  // Roles allowed to load the view; empty means any signed-in user.
  roles: Role[];
  // The registration page's view is also open to a sender whose company the
  // admin has not approved.
  allowUnapprovedCompany?: boolean;
  // Only such a sender (the registration page).
  onlyUnapprovedCompany?: boolean;
  // Open without signing in (e.g. the page a printed QR code opens). The
  // view then gets `user: null` for anonymous visitors and must show only
  // what anyone may see.
  public?: boolean;
  load: (context: ViewContext) => Promise<Views[K]>;
};

export function defineView<K extends ViewName>(definition: ViewDefinition<K>): ViewDefinition<K> {
  return definition;
}

export type PublicViewContext = Omit<ViewContext, 'user'> & { user: CurrentUser | null };

// A view anyone may load, signed in or not.
export function definePublicView<K extends ViewName>(definition: {
  name: K;
  load: (context: PublicViewContext) => Promise<Views[K]>;
}): ViewDefinition<K> {
  return { name: definition.name, roles: [], public: true, load: definition.load as ViewDefinition<K>['load'] };
}

// Thrown by a view: the page answers 404.
export class ViewNotFoundError extends Error {
  constructor() {
    super('View not found.');
  }
}

// Thrown by a view: the page sends the browser elsewhere.
export class ViewRedirectError extends Error {
  constructor(readonly location: string) {
    super(`Redirect to ${location}`);
  }
}

export function notFound(): never {
  throw new ViewNotFoundError();
}

export function redirect(location: string): never {
  throw new ViewRedirectError(location);
}
