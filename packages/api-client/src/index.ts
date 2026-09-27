import type {
  ActivityItemDto,
  AnalyticsSummaryDto,
  ApiErrorBody,
  AttachmentDto,
  AuthSessionDto,
  AuthTokensDto,
  BedLayoutDto,
  BedLayoutSaveResponse,
  CareActivityDto,
  DashboardSummaryDto,
  GardenDto,
  HarvestDto,
  HarvestListItemDto,
  HealthLiveResponse,
  HealthReadyResponse,
  JournalEntryDto,
  JournalListItemDto,
  MessageResponse,
  PaginatedResponse,
  PlantDto,
  PlantTypeDto,
  ProblemDto,
  ProblemListItemDto,
  TaskDto,
  UploadUrlResponse,
  UserPublicDto,
  ZoneDto,
  ZoneListItemDto,
  GardenPlanDto,
  GardenPlanDetailsDto,
  CreateGardenPlanDto,
  UpdateGardenPlanDto,
  BatchPlanObjectsDto,
  SaveGardenPlanResponse,
  PlanObjectDto,
} from '@smart-garden/types';

function defaultFallbackIdempotencyKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class ApiClientError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string[]>;
  readonly requestId?: string;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiClientError';
    this.statusCode = body.statusCode;
    this.code = body.code;
    this.fieldErrors = body.fieldErrors;
    this.requestId = body.requestId;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  getCsrfToken?: () => string | null | Promise<string | null>;
  credentials?: RequestCredentials;
  fetchImpl?: typeof fetch;
  onAccessToken?: (token: string) => void;
  onAuthFailure?: () => void;
  /**
   * Mobile transport: refresh token travels in JSON body (rotated on every
   * refresh), CSRF is skipped server-side via `X-Client: mobile`.
   * Web transport (default): refresh in HttpOnly cookie + CSRF double-submit.
   */
  clientType?: 'web' | 'mobile';
  /** Mobile only: current refresh token for the refresh request body. */
  getRefreshToken?: () => string | null | Promise<string | null>;
  /** Mobile only: called with the rotated refresh token after refresh. */
  onRefreshToken?: (token: string) => void;
}

export type AuthHandlers = {
  onAccessToken?: (token: string) => void;
  onAuthFailure?: () => void;
};

type JsonBody = Record<string, unknown> | undefined;

type RequestOptions = RequestInit & {
  json?: JsonBody;
  /** Internal: do not attempt 401 → refresh → retry */
  skipAuthRetry?: boolean;
};

const NO_REFRESH_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/verify-email',
  '/api/v1/auth/resend-verification',
];

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken?: ApiClientOptions['getAccessToken'];
  private readonly getCsrfToken?: ApiClientOptions['getCsrfToken'];
  private readonly credentials: RequestCredentials;
  private readonly fetchImpl: typeof fetch;
  private onAccessToken?: AuthHandlers['onAccessToken'];
  private onAuthFailure?: AuthHandlers['onAuthFailure'];
  private readonly clientType: 'web' | 'mobile';
  private readonly getRefreshToken?: ApiClientOptions['getRefreshToken'];
  private readonly onRefreshToken?: ApiClientOptions['onRefreshToken'];
  private refreshPromise: Promise<AuthTokensDto & { user: UserPublicDto }> | null = null;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getAccessToken = options.getAccessToken;
    this.getCsrfToken = options.getCsrfToken;
    this.credentials = options.credentials ?? 'include';
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.onAccessToken = options.onAccessToken;
    this.onAuthFailure = options.onAuthFailure;
    this.clientType = options.clientType ?? 'web';
    this.getRefreshToken = options.getRefreshToken;
    this.onRefreshToken = options.onRefreshToken;
  }

  bindAuthHandlers(handlers: AuthHandlers): () => void {
    const previousAccessToken = this.onAccessToken;
    const previousAuthFailure = this.onAuthFailure;
    this.onAccessToken = handlers.onAccessToken;
    this.onAuthFailure = handlers.onAuthFailure;
    return () => {
      this.onAccessToken = previousAccessToken;
      this.onAuthFailure = previousAuthFailure;
    };
  }

  // Health
  getHealthLive(): Promise<HealthLiveResponse> {
    return this.request('/health/live');
  }

  getHealthReady(): Promise<HealthReadyResponse> {
    return this.request('/health/ready');
  }

  // Auth
  register(body: { name: string; email: string; password: string }): Promise<MessageResponse> {
    return this.request('/api/v1/auth/register', { method: 'POST', json: body });
  }

  verifyEmail(token: string): Promise<MessageResponse> {
    return this.request('/api/v1/auth/verify-email', { method: 'POST', json: { token } });
  }

  resendVerification(email: string): Promise<MessageResponse> {
    return this.request('/api/v1/auth/resend-verification', { method: 'POST', json: { email } });
  }

  login(body: {
    email: string;
    password: string;
    clientType?: 'web' | 'mobile';
    deviceName?: string;
  }): Promise<{ user: UserPublicDto; tokens: AuthTokensDto }> {
    return this.request('/api/v1/auth/login', {
      method: 'POST',
      json: { clientType: this.clientType, ...body },
    });
  }

  refresh(body?: {
    refreshToken?: string;
    clientType?: 'web' | 'mobile';
  }): Promise<AuthTokensDto & { user: UserPublicDto }> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    const clientType = body?.clientType ?? this.clientType;
    this.refreshPromise = (async () => {
      try {
        const refreshToken =
          body?.refreshToken ??
          (clientType === 'mobile' && this.getRefreshToken
            ? await this.getRefreshToken()
            : null);
        const result = await this.request<AuthTokensDto & { user: UserPublicDto }>(
          '/api/v1/auth/refresh',
          {
            method: 'POST',
            json: { clientType, ...body, ...(refreshToken ? { refreshToken } : {}) },
            skipAuthRetry: true,
          },
        );
        this.onAccessToken?.(result.accessToken);
        if (result.refreshToken && this.onRefreshToken) {
          this.onRefreshToken(result.refreshToken);
        }
        return result;
      } catch (error) {
        this.onAuthFailure?.();
        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();
    return this.refreshPromise;
  }

  logout(): Promise<MessageResponse> {
    return this.request('/api/v1/auth/logout', { method: 'POST', json: {} });
  }

  logoutAll(): Promise<MessageResponse> {
    return this.request('/api/v1/auth/logout-all', { method: 'POST', json: {} });
  }

  forgotPassword(email: string): Promise<MessageResponse> {
    return this.request('/api/v1/auth/forgot-password', { method: 'POST', json: { email } });
  }

  resetPassword(token: string, password: string): Promise<MessageResponse> {
    return this.request('/api/v1/auth/reset-password', {
      method: 'POST',
      json: { token, password },
    });
  }

  changePassword(body: { currentPassword: string; newPassword: string }): Promise<MessageResponse> {
    return this.request('/api/v1/auth/change-password', { method: 'POST', json: body });
  }

  me(): Promise<UserPublicDto> {
    return this.request('/api/v1/auth/me');
  }

  listSessions(): Promise<AuthSessionDto[]> {
    return this.request('/api/v1/auth/sessions');
  }

  revokeSession(sessionId: string): Promise<MessageResponse> {
    return this.request(`/api/v1/auth/sessions/${sessionId}`, { method: 'DELETE' });
  }

  updateProfile(body: Record<string, unknown>): Promise<UserPublicDto> {
    return this.request('/api/v1/profile', { method: 'PATCH', json: body });
  }

  // Gardens
  listGardens(
    query?: Record<string, string | number | undefined>,
  ): Promise<PaginatedResponse<GardenDto>> {
    return this.request(`/api/v1/gardens${qs(query)}`);
  }

  createGarden(body: Record<string, unknown>): Promise<GardenDto> {
    return this.request('/api/v1/gardens', { method: 'POST', json: body });
  }

  getGarden(gardenId: string): Promise<GardenDto> {
    return this.request(`/api/v1/gardens/${gardenId}`);
  }

  updateGarden(gardenId: string, body: Record<string, unknown>): Promise<GardenDto> {
    return this.request(`/api/v1/gardens/${gardenId}`, { method: 'PATCH', json: body });
  }

  deleteGarden(gardenId: string): Promise<MessageResponse> {
    return this.request(`/api/v1/gardens/${gardenId}`, { method: 'DELETE' });
  }

  // Garden Planner
  listGardenPlans(gardenId: string): Promise<GardenPlanDto[]> {
    return this.request(`/api/v1/gardens/${gardenId}/plans`);
  }

  getActiveGardenPlan(gardenId: string): Promise<GardenPlanDetailsDto> {
    return this.request(`/api/v1/gardens/${gardenId}/plans/active`);
  }

  getGardenPlan(planId: string): Promise<GardenPlanDetailsDto> {
    return this.request(`/api/v1/plans/${planId}`);
  }

  createGardenPlan(
    gardenId: string,
    body: CreateGardenPlanDto,
    idempotencyKey?: string,
  ): Promise<GardenPlanDto> {
    const key = idempotencyKey || defaultFallbackIdempotencyKey('plan');
    return this.request(`/api/v1/gardens/${gardenId}/plans`, {
      method: 'POST',
      json: body as unknown as JsonBody,
      headers: { 'Idempotency-Key': key },
    });
  }

  updateGardenPlan(planId: string, body: UpdateGardenPlanDto): Promise<GardenPlanDto> {
    return this.request(`/api/v1/plans/${planId}`, {
      method: 'PATCH',
      json: body as unknown as JsonBody,
    });
  }

  deleteGardenPlan(planId: string): Promise<MessageResponse> {
    return this.request(`/api/v1/plans/${planId}`, { method: 'DELETE' });
  }

  savePlanObjects(
    planId: string,
    body: BatchPlanObjectsDto,
    idempotencyKey?: string,
  ): Promise<SaveGardenPlanResponse> {
    const key = idempotencyKey || defaultFallbackIdempotencyKey('save-plan');
    return this.request(`/api/v1/plans/${planId}/objects`, {
      method: 'PUT',
      json: body as unknown as JsonBody,
      headers: { 'Idempotency-Key': key },
    });
  }

  saveGardenPlanObjects(
    planId: string,
    body: BatchPlanObjectsDto,
    idempotencyKey?: string,
  ): Promise<SaveGardenPlanResponse> {
    return this.savePlanObjects(planId, body, idempotencyKey);
  }

  duplicateGardenPlan(
    planId: string,
    body?: { name?: string; isActive?: boolean },
    idempotencyKey?: string,
  ): Promise<GardenPlanDetailsDto> {
    const key = idempotencyKey || defaultFallbackIdempotencyKey('dup-plan');
    return this.request(`/api/v1/plans/${planId}/duplicate`, {
      method: 'POST',
      json: body as unknown as JsonBody,
      headers: { 'Idempotency-Key': key },
    });
  }

  createPlanObject(
    planId: string,
    body: Record<string, unknown>,
  ): Promise<PlanObjectDto> {
    return this.request(`/api/v1/plans/${planId}/objects`, {
      method: 'POST',
      json: body as unknown as JsonBody,
    });
  }

  updatePlanObject(
    planId: string,
    objectId: string,
    body: Record<string, unknown>,
  ): Promise<PlanObjectDto> {
    return this.request(`/api/v1/plans/${planId}/objects/${objectId}`, {
      method: 'PATCH',
      json: body as unknown as JsonBody,
    });
  }

  deletePlanObject(planId: string, objectId: string): Promise<MessageResponse> {
    return this.request(`/api/v1/plans/${planId}/objects/${objectId}`, {
      method: 'DELETE',
    });
  }


  // Zones
  listZones(
    gardenId: string,
    query?: Record<string, string | number | undefined>,
  ): Promise<PaginatedResponse<ZoneDto>> {
    return this.request(`/api/v1/gardens/${gardenId}/zones${qs(query)}`);
  }

  createZone(gardenId: string, body: Record<string, unknown>): Promise<ZoneDto> {
    return this.request(`/api/v1/gardens/${gardenId}/zones`, { method: 'POST', json: body });
  }

  getZone(zoneId: string): Promise<ZoneDto> {
    return this.request(`/api/v1/zones/${zoneId}`);
  }

  updateZone(zoneId: string, body: Record<string, unknown>): Promise<ZoneDto> {
    return this.request(`/api/v1/zones/${zoneId}`, { method: 'PATCH', json: body });
  }

  deleteZone(zoneId: string): Promise<MessageResponse> {
    return this.request(`/api/v1/zones/${zoneId}`, { method: 'DELETE' });
  }

  // Plants
  listPlantTypes(query?: Record<string, string | number | undefined>): Promise<{
    data: PlantTypeDto[];
    meta: { total: number; limit: number; offset: number };
  }> {
    return this.request(`/api/v1/plant-types${qs(query)}`);
  }

  createPlantType(body: Record<string, unknown>, idempotencyKey: string): Promise<PlantTypeDto> {
    return this.request('/api/v1/plant-types', {
      method: 'POST',
      json: body,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  getBedLayout(zoneId: string): Promise<BedLayoutDto> {
    return this.request(`/api/v1/zones/${zoneId}/layout`);
  }

  saveBedLayout(
    zoneId: string,
    body: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<BedLayoutSaveResponse> {
    return this.request(`/api/v1/zones/${zoneId}/layout`, {
      method: 'PUT',
      json: body,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  listPlants(
    query?: Record<string, string | number | undefined>,
  ): Promise<PaginatedResponse<PlantDto>> {
    return this.request(`/api/v1/plants${qs(query)}`);
  }

  listZonePlants(
    zoneId: string,
    query?: Record<string, string | number | undefined>,
  ): Promise<PaginatedResponse<PlantDto>> {
    return this.request(`/api/v1/zones/${zoneId}/plants${qs(query)}`);
  }

  createPlant(
    zoneId: string,
    body: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<PlantDto> {
    return this.request(`/api/v1/zones/${zoneId}/plants`, {
      method: 'POST',
      json: body,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  getPlant(plantId: string): Promise<PlantDto> {
    return this.request(`/api/v1/plants/${plantId}`);
  }

  updatePlant(plantId: string, body: Record<string, unknown>): Promise<PlantDto> {
    return this.request(`/api/v1/plants/${plantId}`, { method: 'PATCH', json: body });
  }

  deletePlant(plantId: string): Promise<MessageResponse> {
    return this.request(`/api/v1/plants/${plantId}`, { method: 'DELETE' });
  }

  // Events
  listJournal(plantId: string): Promise<PaginatedResponse<JournalEntryDto>> {
    return this.request(`/api/v1/plants/${plantId}/journal`);
  }

  createJournal(
    plantId: string,
    body: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<JournalEntryDto> {
    return this.request(`/api/v1/plants/${plantId}/journal`, {
      method: 'POST',
      json: body,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  deleteJournal(entryId: string): Promise<MessageResponse> {
    return this.request(`/api/v1/journal/${entryId}`, { method: 'DELETE' });
  }

  listHarvests(plantId: string): Promise<PaginatedResponse<HarvestDto>> {
    return this.request(`/api/v1/plants/${plantId}/harvests`);
  }

  createHarvest(
    plantId: string,
    body: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<HarvestDto> {
    return this.request(`/api/v1/plants/${plantId}/harvests`, {
      method: 'POST',
      json: body,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  deleteHarvest(harvestId: string): Promise<MessageResponse> {
    return this.request(`/api/v1/harvests/${harvestId}`, { method: 'DELETE' });
  }

  listProblems(plantId: string): Promise<PaginatedResponse<ProblemDto>> {
    return this.request(`/api/v1/plants/${plantId}/problems`);
  }

  createProblem(
    plantId: string,
    body: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<ProblemDto> {
    return this.request(`/api/v1/plants/${plantId}/problems`, {
      method: 'POST',
      json: body,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  updateProblem(problemId: string, body: Record<string, unknown>): Promise<ProblemDto> {
    return this.request(`/api/v1/problems/${problemId}`, { method: 'PATCH', json: body });
  }

  deleteProblem(problemId: string): Promise<MessageResponse> {
    return this.request(`/api/v1/problems/${problemId}`, { method: 'DELETE' });
  }

  listCareActivities(plantId: string): Promise<PaginatedResponse<CareActivityDto>> {
    return this.request(`/api/v1/plants/${plantId}/care-activities`);
  }

  createCareActivity(
    plantId: string,
    body: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<CareActivityDto> {
    return this.request(`/api/v1/plants/${plantId}/care-activities`, {
      method: 'POST',
      json: body,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  deleteCareActivity(activityId: string): Promise<MessageResponse> {
    return this.request(`/api/v1/care-activities/${activityId}`, { method: 'DELETE' });
  }

  listTasks(
    query?: Record<string, string | number | undefined>,
  ): Promise<PaginatedResponse<TaskDto>> {
    return this.request(`/api/v1/tasks${qs(query)}`);
  }

  createTask(body: Record<string, unknown>, idempotencyKey: string): Promise<TaskDto> {
    return this.request('/api/v1/tasks', {
      method: 'POST',
      json: body,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  updateTask(taskId: string, body: Record<string, unknown>): Promise<TaskDto> {
    return this.request(`/api/v1/tasks/${taskId}`, { method: 'PATCH', json: body });
  }

  deleteTask(taskId: string): Promise<MessageResponse> {
    return this.request(`/api/v1/tasks/${taskId}`, { method: 'DELETE' });
  }

  createUploadUrl(
    body: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<UploadUrlResponse> {
    return this.request('/api/v1/attachments/upload-url', {
      method: 'POST',
      json: body,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  confirmAttachment(attachmentId: string): Promise<AttachmentDto> {
    return this.request(`/api/v1/attachments/${attachmentId}/confirm`, {
      method: 'POST',
      json: {},
    });
  }

  deleteAttachment(attachmentId: string): Promise<MessageResponse> {
    return this.request(`/api/v1/attachments/${attachmentId}`, { method: 'DELETE' });
  }

  getAnalyticsSummary(gardenId?: string): Promise<AnalyticsSummaryDto> {
    return this.request(`/api/v1/analytics/summary${qs({ gardenId })}`);
  }

  getDashboardSummary(): Promise<DashboardSummaryDto> {
    return this.request('/api/v1/dashboard/summary');
  }

  listActivity(
    query?: Record<string, string | number | undefined>,
  ): Promise<PaginatedResponse<ActivityItemDto>> {
    return this.request(`/api/v1/activity${qs(query)}`);
  }

  listAllZones(
    query?: Record<string, string | number | undefined>,
  ): Promise<PaginatedResponse<ZoneListItemDto>> {
    return this.request(`/api/v1/zones${qs(query)}`);
  }

  listAllJournal(
    query?: Record<string, string | number | undefined>,
  ): Promise<PaginatedResponse<JournalListItemDto>> {
    return this.request(`/api/v1/journal${qs(query)}`);
  }

  listAllHarvests(
    query?: Record<string, string | number | undefined>,
  ): Promise<PaginatedResponse<HarvestListItemDto>> {
    return this.request(`/api/v1/harvests${qs(query)}`);
  }

  listAllProblems(
    query?: Record<string, string | number | undefined>,
  ): Promise<PaginatedResponse<ProblemListItemDto>> {
    return this.request(`/api/v1/problems${qs(query)}`);
  }

  async request<T>(path: string, init: RequestOptions = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }
    if (this.clientType === 'mobile' && !headers.has('X-Client')) {
      headers.set('X-Client', 'mobile');
    }

    const token = this.getAccessToken ? await this.getAccessToken() : null;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const method = (init.method ?? 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const csrf = this.getCsrfToken ? await this.getCsrfToken() : null;
      if (csrf) {
        headers.set('X-CSRF-Token', csrf);
      }
      if (init.json !== undefined && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }

    const { json, skipAuthRetry, ...rest } = init;
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...rest,
      method,
      headers,
      credentials: this.credentials,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });

    if (!response.ok) {
      if (response.status === 401 && !skipAuthRetry && this.shouldAttemptRefresh(path)) {
        const refreshed = await this.refreshSessionSingleFlight();
        if (refreshed) {
          try {
            await response.arrayBuffer();
          } catch {
            // ignore
          }
          return this.request<T>(path, { ...init, skipAuthRetry: true });
        }
      }

      let body: ApiErrorBody | null = null;
      try {
        body = (await response.json()) as ApiErrorBody;
      } catch {
        body = null;
      }
      if (body?.code) {
        throw new ApiClientError(body);
      }
      throw new Error(`HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private shouldAttemptRefresh(path: string): boolean {
    return !NO_REFRESH_PATHS.some((prefix) => path.startsWith(prefix));
  }

  private async refreshSessionSingleFlight(): Promise<boolean> {
    try {
      await this.refresh();
      return true;
    } catch {
      return false;
    }
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return new ApiClient(options);
}

function qs(query?: Record<string, string | number | undefined>): string {
  if (!query) {
    return '';
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}
