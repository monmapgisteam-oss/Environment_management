import { getApiUser, type CurrentUser } from '@/lib/auth';
import { querySurvey, SURVEY_LAYER_ID, SURVEY_REPEAT_LAYER_ID } from '@/lib/db/survey';
import { normalizeRegister } from '@/lib/reports/companies';

// Survey data is private. Readers are checked in the database like every other
// API (active account, own password set). Review staff, managers and admins
// see every record; a sender sees only records filed under its own register.

export async function getSurveyViewer(): Promise<CurrentUser | null> {
  return getApiUser();
}

// The only register a viewer may read, or null for "all records".
export function surveyRegisterFor(user: CurrentUser): string | null {
  return user.role === 'sender' ? normalizeRegister(user.company?.registerNumber) : null;
}

// Whether a viewer may open one record (a report point, or an evaluator row of
// one) and therefore its photos.
export async function canSeeSurveyRecord(user: CurrentUser, layerId: number, objectId: number): Promise<boolean> {
  const register = surveyRegisterFor(user);
  if (register === null) return true;
  if (!register) return false;
  let [feature] = await querySurvey(layerId, { filter: { objectIds: [objectId] } });
  if (feature && layerId === SURVEY_REPEAT_LAYER_ID) {
    const parent = String(feature.attributes.parentglobalid || '').toLowerCase();
    const parents = await querySurvey(SURVEY_LAYER_ID);
    feature = parents.find((candidate) => String(candidate.attributes.globalid || '').toLowerCase() === parent) as typeof feature;
  } else if (layerId !== SURVEY_LAYER_ID) {
    return false;
  }
  return !!feature && normalizeRegister(feature.attributes.Register) === register;
}
