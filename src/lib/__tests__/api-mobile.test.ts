import { createApiClient, type ApiClient } from '@smart-garden/api-client';

type FetchCall = { url: string; init: RequestInit };

function makeClient(
  responses: Array<{ status: number; body: unknown }>,
  options: Partial<Parameters<typeof createApiClient>[0]> = {},
): { client: ApiClient; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  let i = 0;
  const fetchImpl = ((url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    const next = responses[Math.min(i, responses.length - 1)]!;
    i += 1;
    return Promise.resolve(
      new Response(JSON.stringify(next.body), {
        status: next.status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }) as unknown as typeof fetch;

  const client = createApiClient({
    baseUrl: 'http://localhost:3001',
    fetchImpl,
    ...options,
  });
  return { client, calls };
}

describe('mobile transport', () => {
  it('sends X-Client: mobile and clientType mobile in login body', async () => {
    const { client, calls } = makeClient(
      [
        {
          status: 200,
          body: {
            user: { id: 'u1' },
            tokens: { accessToken: 'a', refreshToken: 'r', expiresIn: 900, tokenType: 'Bearer' },
          },
        },
      ],
      { clientType: 'mobile' },
    );

    await client.login({ email: 'a@b.c', password: 'secret123' });

    const call = calls[0]!;
    expect(call.url).toBe('http://localhost:3001/api/v1/auth/login');
    expect(new Headers(call.init.headers).get('X-Client')).toBe('mobile');
    const body = JSON.parse(String(call.init.body)) as Record<string, unknown>;
    expect(body.clientType).toBe('mobile');
  });

  it('refresh sends stored refreshToken in JSON body and saves rotated token', async () => {
    const rotated: string[] = [];
    const { client, calls } = makeClient(
      [
        {
          status: 200,
          body: {
            accessToken: 'new-access',
            refreshToken: 'new-refresh-0123456789012345678901234567890',
            expiresIn: 900,
            tokenType: 'Bearer',
            user: { id: 'u1' },
          },
        },
      ],
      {
        clientType: 'mobile',
        getRefreshToken: () => 'old-refresh-0123456789012345678901234567890',
        onRefreshToken: (token) => rotated.push(token),
      },
    );

    const result = await client.refresh();

    const call = calls[0]!;
    expect(call.url).toBe('http://localhost:3001/api/v1/auth/refresh');
    const body = JSON.parse(String(call.init.body)) as Record<string, unknown>;
    expect(body.clientType).toBe('mobile');
    expect(body.refreshToken).toBe('old-refresh-0123456789012345678901234567890');
    expect(result.accessToken).toBe('new-access');
    expect(rotated).toEqual(['new-refresh-0123456789012345678901234567890']);
  });

  it('attaches Bearer access token', async () => {
    const { client, calls } = makeClient([{ status: 200, body: {} }], {
      clientType: 'mobile',
      getAccessToken: () => 'token-abc',
    });

    await client.getDashboardSummary();

    expect(new Headers(calls[0]!.init.headers).get('Authorization')).toBe('Bearer token-abc');
  });
});
