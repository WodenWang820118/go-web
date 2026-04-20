import { expect, Page, test } from '@playwright/test';

test('uses zh-TW by default and persists an English override across reloads', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  await expect(page.getByRole('link', { name: '開始本機圍棋', exact: true })).toBeVisible();

  await page.getByTestId('locale-option-en').click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('link', { name: 'Start local Go', exact: true })).toBeVisible();

  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('link', { name: 'Start local Go', exact: true })).toBeVisible();
});

test('starts a Go match and enters the scoring flow', async ({ page }) => {
  await useEnglish(page);

  await clickLocalLink(page, '/setup/go');
  await expect(page.getByTestId('setup-form')).toBeVisible();

  await page.getByRole('button', { name: /start local match/i }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();

  await page.getByRole('button', { name: 'Pass' }).click();
  await page.getByRole('button', { name: 'Pass' }).click();

  const finalizeButton = page.getByRole('button', { name: /finalize score/i });
  await expect(finalizeButton).toBeVisible();
});

test('starts a Gomoku match and creates five in a row', async ({ page }) => {
  await useEnglish(page);

  await clickLocalLink(page, '/setup/gomoku');
  await page.getByRole('button', { name: /start local match/i }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();

  for (const point of [
    '3-7',
    '0-0',
    '4-7',
    '0-1',
    '5-7',
    '0-2',
    '6-7',
    '0-3',
    '7-7',
  ]) {
    await page.getByTestId(`intersection-${point}`).click();
  }

  const resultDialog = page.getByTestId('match-result-dialog');
  await expect(resultDialog).toBeVisible();
  await expect(resultDialog.getByText(/five in a row/i)).toBeVisible();
});

test('keeps the desktop lobby pinned to the viewport while the room table scrolls internally', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockLobby(page, createDenseLobbyRooms());
  await useEnglish(page);

  const scrollOverflow = await page.evaluate(() => {
    const root = document.scrollingElement;
    return root ? root.scrollHeight - window.innerHeight : 0;
  });
  expect(scrollOverflow).toBeLessThanOrEqual(1);

  const panel = page.getByTestId('lobby-room-table-scroll');
  const header = page.getByTestId('lobby-room-table-head');

  await expect(panel).toBeVisible();
  await expect(page.getByTestId('lobby-announcement-panel')).toBeVisible();
  await expect(page.getByTestId('lobby-online-players-panel')).toBeVisible();

  const panelMetrics = await panel.evaluate(node => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
  }));
  expect(panelMetrics.scrollHeight).toBeGreaterThan(panelMetrics.clientHeight);

  const beforeHeader = await header.boundingBox();
  await panel.evaluate(node => {
    node.scrollTop = 480;
    node.dispatchEvent(new Event('scroll'));
  });
  const afterScrollTop = await panel.evaluate(node => node.scrollTop);
  const afterHeader = await header.boundingBox();

  expect(afterScrollTop).toBeGreaterThan(0);
  expect(Math.abs((beforeHeader?.y ?? 0) - (afterHeader?.y ?? 0))).toBeLessThan(4);
});

test('shows the dense lobby with announcement and online-player panels on tablet widths', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await mockLobby(page, createDenseLobbyRooms());
  await useEnglish(page);

  const scrollOverflow = await page.evaluate(() => {
    const root = document.scrollingElement;
    return root ? root.scrollHeight - window.innerHeight : 0;
  });
  expect(scrollOverflow).toBeLessThanOrEqual(1);

  await page.getByTestId('lobby-tab-ready').click();
  await expect(page.getByTestId('lobby-room-READY05')).toBeVisible();
  await expect(page.getByTestId('lobby-announcement-panel')).toBeVisible();
  await expect(page.getByTestId('lobby-online-players-panel')).toBeVisible();
  await expect(page.getByTestId('online-lobby-selected-room')).toHaveCount(0);
});

test('renders stacked mobile cards with working open-room and join actions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockLobby(page, [
    createLobbyRoom('WAIT01', 'waiting', 'Waiting Host 01'),
    createLobbyRoom('WAIT02', 'waiting', 'Waiting Host 02'),
  ]);
  await useEnglish(page);

  await expect(page.getByTestId('online-lobby-selected-room')).toHaveCount(0);
  await expect(page.getByTestId('lobby-mobile-room-WAIT01')).toBeVisible();
  await expect(page.getByTestId('lobby-announcement-panel')).toBeVisible();
  await expect(page.getByTestId('lobby-online-players-panel')).toBeVisible();

  await page.getByTestId('online-lobby-mobile-open-WAIT01').click();
  await expect(page).toHaveURL(/\/online\/room\/WAIT01$/);
  await expect(page.getByTestId('room-layout')).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('lobby-mobile-room-WAIT01')).toBeVisible();

  await page.getByTestId('lobby-display-name-input').fill('Captain');
  await page.getByTestId('online-lobby-mobile-primary-WAIT01').click();
  await expect(page).toHaveURL(/\/online\/room\/WAIT01$/);
  await expect(page.getByTestId('room-layout')).toBeVisible();
});

async function useEnglish(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByTestId('locale-option-en').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
}

async function clickLocalLink(page: Page, href: '/setup/go' | '/setup/gomoku'): Promise<void> {
  await page
    .locator(`a[href="${href}"]`)
    .evaluate((node: HTMLAnchorElement) => node.click());
}

async function mockLobby(page: Page, rooms: LobbyRoomFixture[]): Promise<void> {
  const onlineParticipants = createLobbyOnlineParticipants(rooms);
  const snapshots = new Map(
    rooms.map(room => [
      room.roomId,
      createRoomSnapshot(room.roomId, room.hostDisplayName),
    ])
  );

  await page.route('**/api/rooms**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (request.method() === 'GET' && pathname === '/api/rooms') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rooms,
          onlineParticipants,
        }),
      });
      return;
    }

    const roomMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9]+)$/);
    if (request.method() === 'GET' && roomMatch) {
      const roomId = roomMatch[1];
      if (!roomId) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          snapshot: snapshots.get(roomId) ?? createRoomSnapshot(roomId, `Host ${roomId}`),
        }),
      });
      return;
    }

    const joinMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/join$/);
    if (request.method() === 'POST' && joinMatch) {
      const roomId = joinMatch[1];
      if (!roomId) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          roomId,
          participantId: 'guest-1',
          participantToken: 'token-1',
          resumed: false,
          snapshot: snapshots.get(roomId) ?? createRoomSnapshot(roomId, `Host ${roomId}`),
        }),
      });
      return;
    }

    await route.continue();
  });
}

type LobbyRoomFixture = ReturnType<typeof createLobbyRoom>;

function createDenseLobbyRooms(): LobbyRoomFixture[] {
  return [
    ...Array.from({ length: 7 }, (_, index) =>
      createLobbyRoom(
        `LIVE${String(index + 1).padStart(2, '0')}`,
        'live',
        `Live Host ${String(index + 1).padStart(2, '0')}`,
        {
          mode: index % 2 === 0 ? 'go' : 'gomoku',
          boardSize: index % 2 === 0 ? 19 : 15,
          players: {
            black: `Live Black ${index + 1}`,
            white: `Live White ${index + 1}`,
          },
          participantCount: 2,
          onlineCount: 2,
          spectatorCount: 3 + index,
        }
      )
    ),
    ...Array.from({ length: 6 }, (_, index) =>
      createLobbyRoom(
        `READY${String(index + 1).padStart(2, '0')}`,
        'ready',
        `Ready Host ${String(index + 1).padStart(2, '0')}`,
        {
          mode: 'go',
          boardSize: 19,
          players: {
            black: `Ready Host ${String(index + 1).padStart(2, '0')}`,
            white: `Ready Guest ${index + 1}`,
          },
          participantCount: 2,
          onlineCount: 2,
          spectatorCount: index,
        }
      )
    ),
    ...Array.from({ length: 6 }, (_, index) =>
      createLobbyRoom(
        `WAIT${String(index + 1).padStart(2, '0')}`,
        'waiting',
        `Waiting Host ${String(index + 1).padStart(2, '0')}`,
        {
          mode: index % 2 === 0 ? null : 'gomoku',
          boardSize: index % 2 === 0 ? null : 15,
          players: {
            black: index % 2 === 0 ? null : `Waiting Host ${index + 1}`,
            white: null,
          },
          participantCount: index % 2 === 0 ? 1 : 2,
          onlineCount: 1,
          spectatorCount: 1,
        }
      )
    ),
  ];
}

function createLobbyRoom(
  roomId: string,
  status: 'live' | 'ready' | 'waiting',
  hostDisplayName: string,
  overrides: Partial<{
    mode: 'go' | 'gomoku' | null;
    boardSize: number | null;
    players: {
      black: string | null;
      white: string | null;
    };
    participantCount: number;
    onlineCount: number;
    spectatorCount: number;
  }> = {}
) {
  return {
    roomId,
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
    hostDisplayName,
    status,
    mode: overrides.mode ?? 'go',
    boardSize: overrides.boardSize ?? 19,
    players: overrides.players ?? {
      black: hostDisplayName,
      white: 'Guest',
    },
    participantCount: overrides.participantCount ?? 2,
    onlineCount: overrides.onlineCount ?? 2,
    spectatorCount: overrides.spectatorCount ?? 0,
  };
}

function createRoomSnapshot(roomId: string, hostDisplayName: string) {
  return {
    roomId,
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
    hostParticipantId: 'host-1',
    participants: [
      {
        participantId: 'host-1',
        displayName: hostDisplayName,
        seat: null,
        isHost: true,
        online: true,
        muted: false,
        joinedAt: '2026-03-20T00:00:00.000Z',
      },
    ],
    seatState: {
      black: null,
      white: null,
    },
    nextMatchSettings: {
      mode: 'go',
      boardSize: 19,
      komi: 6.5,
    },
    rematch: null,
    autoStartBlockedUntilSeatChange: false,
    match: null,
    chat: [],
  };
}

function createLobbyOnlineParticipants(rooms: LobbyRoomFixture[]) {
  return rooms.slice(0, 10).flatMap(room => {
    if (room.status === 'live') {
      return [
        {
          participantId: `${room.roomId}-black`,
          displayName: room.players.black ?? `${room.hostDisplayName} Black`,
          roomId: room.roomId,
          seat: 'black',
          isHost: true,
          joinedAt: '2026-03-20T00:00:00.000Z',
          activity: 'playing',
        },
        {
          participantId: `${room.roomId}-white`,
          displayName: room.players.white ?? 'Guest',
          roomId: room.roomId,
          seat: 'white',
          isHost: false,
          joinedAt: '2026-03-20T00:01:00.000Z',
          activity: 'playing',
        },
      ];
    }

    if (room.status === 'ready' && room.players.black && room.players.white) {
      return [
        {
          participantId: `${room.roomId}-black`,
          displayName: room.players.black,
          roomId: room.roomId,
          seat: 'black',
          isHost: true,
          joinedAt: '2026-03-20T00:00:00.000Z',
          activity: 'seated',
        },
        {
          participantId: `${room.roomId}-white`,
          displayName: room.players.white,
          roomId: room.roomId,
          seat: 'white',
          isHost: false,
          joinedAt: '2026-03-20T00:01:00.000Z',
          activity: 'seated',
        },
      ];
    }

    return [
      {
        participantId: `${room.roomId}-watcher`,
        displayName: room.hostDisplayName,
        roomId: room.roomId,
        seat: null,
        isHost: true,
        joinedAt: '2026-03-20T00:00:00.000Z',
        activity: 'watching',
      },
    ];
  });
}
