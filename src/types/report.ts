export type MediaFile = {
  id: string;
  mediaType: string;
  objectUrl: string;
  originalFilename?: string | null;
};

export type ResponseListItem = {
  id: string;
  surveyId: string;
  requestId: string;
  submittedAt: string;
  preview?: string | null;
};

export type PagedResult<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type ResponseQuestion = {
  questionId: string;
  questionText: string;
  description?: string | null;
  mediaFiles?: MediaFile[];
  questionTypeId: string;
  questionTypeCode: string;
  isRequired: boolean;
  isApplicable: boolean;
  answerText?: string | null;
  answerNumber?: number | null;
  answerDate?: string | null;
  provinceCode?: string | null;
  wardCode?: string | null;
  province?: string | null;
  ward?: string | null;
  addressDetail?: string | null;
  optionIds?: string[];
  optionTexts?: string[];
  formattedAnswer?: string | null;
};

export type ResponsePage = {
  pageId: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  mediaFiles?: MediaFile[];
  questions: ResponseQuestion[];
};

export type ResponseDetail = {
  id: string;
  surveyId: string;
  surveyTitle: string;
  surveyDescription?: string | null;
  mediaFiles?: MediaFile[];
  requestId: string;
  submittedAt: string;
  pages: ResponsePage[];
};

export type ChoiceOptionStatistic = {
  optionId: string;
  optionText: string;
  count: number;
  percentage: number;
};

export type SurveyQuestionStatistic = {
  questionId: string;
  questionText: string;
  questionTypeCode: string;
  choiceStatistics?: { options: ChoiceOptionStatistic[] } | null;
  numberStatistics?: {
    count: number;
    average: number | null;
    min: number | null;
    max: number | null;
    median: number | null;
  } | null;
  dateStatistics?: { count: number; min: string | null; max: string | null } | null;
  addressStatistics?: {
    count: number;
    topAddresses?: { province: string; ward: string; count: number }[];
    topProvinces?: { name: string; count: number }[];
    topWards?: { name: string; count: number }[];
  } | null;
  textStatistics?: { count: number; topAnswers: { text: string; count: number }[] } | null;
};

export type SurveyStatistics = {
  surveyId: string;
  surveyTitle: string;
  totalResponses: number;
  questions: SurveyQuestionStatistic[];
};

export type ReportFilter = {
  from?: string;
  to?: string;
  questionId?: string;
  optionId?: string;
  text?: string;
  number?: number;
  date?: string;
  province?: string;
  ward?: string;
};

export type SurveyResultQuestion = {
  id: string;
  text?: string | null;
  title?: string | null;
  questionText?: string | null;
  questionTypeCode?: string | null;
  options?: Array<{ id: string; text?: string | null; optionText?: string | null }>;
};

export type SurveyResultDetail = {
  id: string;
  title: string;
  status?: string | null;
  openAt?: string | null;
  closeAt?: string | null;
  creatorUserId?: string | null;
  scheduleWarnings?: string[];
  pages?: Array<{ id: string; title?: string | null; questions?: SurveyResultQuestion[] }>;
};

export type TrafficPoint = {
  bucketStart: string;
  bucketEnd: string;
  views: number;
  uniqueSessions: number;
  startedSessions: number;
  submittedResponses: number;
  submittedSessions: number;
};

export type SurveyTraffic = {
  surveyId: string;
  generatedAt: string;
  from: string;
  to: string;
  timezone: string;
  bucket: string;
  totalViews: number | null;
  uniqueSessions: number | null;
  startedSessions: number | null;
  submittedResponses: number | null;
  submittedSessions: number | null;
  viewToStartRate: number | null;
  startToSubmitRate: number | null;
  viewToSubmitRate: number | null;
  timeline: TrafficPoint[];
  trackingStatus: string;
};

export type ResponseTimelinePoint = { date: string; responses: number };

export type SurveyPageStatistics = {
  surveyId: string;
  trackingStatus: string;
  pages: Array<{
    pageId: string;
    title: string;
    orderIndex: number | null;
    viewedSessions: number | null;
    completedSessions: number | null;
    submittedResponsesWithAnswers: number;
    trackingStatus: string;
  }>;
};
