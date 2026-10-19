import { getPermissions, getUser } from "@/lib/auth";

type SurveyActions = {
  creatorUserId?: string | null;
  canEdit?: boolean;
  canDelete?: boolean;
  canManageAccess?: boolean;
};

export function withSurveyActions<T extends SurveyActions>(survey: T) {
  const permissions = new Set(getPermissions());
  const userId = getUser()?.id;
  const owner = Boolean(userId && survey.creatorUserId && String(userId) === String(survey.creatorUserId));

  return {
    ...survey,
    canEdit: survey.canEdit === true || permissions.has("survey_update_all") ||
      (owner && permissions.has("survey_update")),
    canDelete: survey.canDelete === true || permissions.has("survey_delete_all") ||
      (owner && permissions.has("survey_delete")),
    canManageAccess: survey.canManageAccess === true || permissions.has("survey_update_all") ||
      (owner && permissions.has("survey_update")),
  };
}
