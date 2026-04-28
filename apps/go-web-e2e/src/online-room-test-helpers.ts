import { APIResponse, expect, Page, Request } from '@playwright/test';

const goServerOrigin = (
  process.env['GO_SERVER_ORIGIN'] || 'http://127.0.0.1:3000'
).replace(/\/+$/, '');
const analyticsConsentStorageKey = 'gx.analyticsConsent.v1';
const goServerOriginStorageKey = 'gx.go.serverOrigin';

export async function useEnglish(page: Page): Promise<void> {
  await page.addInitScript(
    ({ consentKey, originKey, originValue }) => {
      window.localStorage.setItem(consentKey, 'denied');
      window.localStorage.setItem(originKey, originValue);
    },
    {
      consentKey: analyticsConsentStorageKey,
      originKey: goServerOriginStorageKey,
      originValue: goServerOrigin,
    },
  );
  await page.goto('/');
  await page.getByTestId('locale-select').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
}

export async function waitForApiHealth(): Promise<void> {
  await expect
    .poll(
      async () => {
        try {
          const response = await fetch(`${goServerOrigin}/api/health`);
          return response.ok;
        } catch {
          return false;
        }
      },
      {
        timeout: 30000,
      },
    )
    .toBe(true);
}

export async function createHostedRoom(
  page: Page,
  displayName: string,
  options: {
    mode?: 'go' | 'gomoku';
    boardSize?: 9 | 13 | 15 | 19;
  } = {},
): Promise<string> {
  const mode = options.mode ?? 'go';
  const boardSize = mode === 'gomoku' ? 15 : (options.boardSize ?? 19);
  const displayNameInput = page.getByTestId('lobby-display-name-input');
  const createRoomButton = page.getByTestId('online-lobby-create-button');
  const appOrigin = new URL(page.url()).origin;

  await displayNameInput.fill(displayName);
  await expect(createRoomButton).toBeEnabled();

  const createRoomResponsePromise = page.waitForResponse(
    (response) => {
      const responseUrl = new URL(response.url());

      return (
        response.request().method() === 'POST' &&
        responseUrl.origin === goServerOrigin &&
        responseUrl.pathname === '/api/rooms'
      );
    },
    {
      timeout: 20000,
    },
  );
  const roomBootstrapResponsePromise = page.waitForResponse(
    (response) => {
      const responseUrl = new URL(response.url());

      return (
        response.request().method() === 'GET' &&
        responseUrl.origin === goServerOrigin &&
        /^\/api\/rooms\/[^/]+$/.test(responseUrl.pathname)
      );
    },
    {
      timeout: 20000,
    },
  );

  await createRoomButton.click();
  await expect(page.getByTestId('lobby-create-room-dialog')).toBeVisible();
  if (mode === 'gomoku') {
    await page.getByTestId('lobby-create-mode-gomoku').click();
    await expect(
      page.getByTestId('lobby-create-board-size-fixed'),
    ).toContainText('15 x 15');
  } else if (boardSize !== 19) {
    await page.getByTestId(`lobby-create-board-size-${boardSize}`).click();
  }
  await page.getByTestId('lobby-create-room-dialog-confirm').click();

  const createRoomResponse = await createRoomResponsePromise;
  const createRoomRequest = createRoomResponse.request();
  const { payload, rawBody } = await readCreateRoomResponse(createRoomResponse);
  const requestBody = readCreateRoomRequestBody(createRoomRequest);
  const requestHeaders = await createRoomRequest.allHeaders();

  expect(
    createRoomResponse.ok(),
    [
      `Expected POST ${goServerOrigin}/api/rooms to succeed.`,
      `Status: ${createRoomResponse.status()} ${createRoomResponse.statusText()}`,
      `Body: ${rawBody || '<empty>'}`,
    ].join('\n'),
  ).toBeTruthy();
  expect(
    requestHeaders['content-type'] ?? '',
    'Expected create-room request to send JSON.',
  ).toContain('application/json');
  expect(
    requestBody,
    'Expected create-room request to include a JSON body.',
  ).not.toBeNull();
  expect(requestBody).toEqual({
    displayName,
    mode,
    boardSize,
  });

  expect(
    payload,
    `Expected create-room response to include a JSON body. Body: ${rawBody || '<empty>'}`,
  ).not.toBeNull();
  const roomId = typeof payload?.roomId === 'string' ? payload.roomId : '';

  expect(
    roomId,
    `Expected create-room response to include roomId. Body: ${rawBody || '<empty>'}`,
  ).not.toBe('');

  const roomBootstrapResponse = await roomBootstrapResponsePromise;
  expect(
    normalizePath(new URL(roomBootstrapResponse.url()).pathname),
    'Expected the room page bootstrap request to load the created room.',
  ).toBe(`/api/rooms/${roomId}`);
  expect(roomBootstrapResponse.ok()).toBeTruthy();

  await page.waitForURL(
    (url) => normalizePath(url.pathname) === `/online/room/${roomId}`,
    {
      timeout: 20000,
    },
  );
  expect(new URL(page.url()).origin).toBe(appOrigin);
  expect(normalizePath(new URL(page.url()).pathname)).toBe(
    `/online/room/${roomId}`,
  );
  await expect(page.getByTestId('room-layout')).toBeVisible();

  return roomId;
}

async function readCreateRoomResponse(response: APIResponse): Promise<{
  payload: {
    roomId?: unknown;
  } | null;
  rawBody: string;
}> {
  const rawBody = await response.text();

  if (!rawBody) {
    return {
      payload: null,
      rawBody,
    };
  }

  try {
    const parsed = JSON.parse(rawBody) as {
      roomId?: unknown;
    };

    return {
      payload: parsed,
      rawBody,
    };
  } catch {
    return {
      payload: null,
      rawBody,
    };
  }
}

function readCreateRoomRequestBody(request: Request): {
  displayName?: unknown;
  mode?: unknown;
  boardSize?: unknown;
} | null {
  const rawBody = request.postData();

  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as {
      displayName?: unknown;
      mode?: unknown;
      boardSize?: unknown;
    };
  } catch {
    return null;
  }
}

function normalizePath(pathname: string): string {
  if (pathname === '/') {
    return pathname;
  }

  return pathname.replace(/\/+$/, '');
}
