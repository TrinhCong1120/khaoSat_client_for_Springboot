type SurveyActions = {
  creatorUserId?: string | null;
  canEdit?: boolean;
  canDelete?: boolean;
  canManageAccess?: boolean;
  canViewResponses?: boolean;
  canManagePublication?: boolean;
};

export function withSurveyActions<T extends SurveyActions>(survey: T) {
  return {
    ...survey,
    canEdit: survey.canEdit === true,
    canDelete: survey.canDelete === true,
    canManageAccess: survey.canManageAccess === true,
    canViewResponses: survey.canViewResponses === true,
    canManagePublication: survey.canManagePublication === true,
  };
}
