import { expect, Page, test } from '@playwright/test';
import { useEnglish } from './online-room-test-helpers';
import {
  createDenseLobbyRooms,
  createLobbyRoom,
  mockLobby,
} from './test-support/lobby-fixtures';

const LAYOUT_TOLERANCE_PX = 1;
const COORDINATE_ALIGNMENT_TOLERANCE_PERCENT = 0.001;
const MIN_LOCAL_BOARD_SIZE_PX = 100;

test('uses the browser locale by default and persists a locale override across reloads', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.getByRole('link', { name: 'Start local Go', exact: true }),
  ).toBeVisible();

  await page.getByTestId('locale-select').selectOption('zh-CN');

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(
    page.getByRole('link', { name: '开始本机围棋', exact: true }),
  ).toBeVisible();

  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(
    page.getByRole('link', { name: '开始本机围棋', exact: true }),
  ).toBeVisible();
});

test('starts a Go match and enters the scoring flow', async ({ page }) => {
  await useEnglish(page);

  await clickLocalLink(page, '/setup/go');
  await expect(page.getByTestId('setup-form')).toBeVisible();

  await page.getByTestId('setup-ko-rule-positional-superko').click();
  await page.getByTestId('setup-scoring-rule-japanese-territory').click();
  await page.getByTestId('setup-nigiri-odd-button').click();
  await expect(page.getByTestId('setup-nigiri-result')).toContainText(
    /starts as Black/i,
  );
  await expect(
    page.getByRole('button', { name: /start local match/i }),
  ).toBeEnabled();
  await page.getByRole('button', { name: /start local match/i }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();

  await page.getByRole('button', { name: 'Pass' }).click();
  await page.getByRole('button', { name: 'Pass' }).click();

  await expect(page.getByText('Japanese territory').first()).toBeVisible();
  await expect(page.getByTestId('match-sidebar-score-prisoners')).toContainText(
    'Prisoner points: Black +0, White +0',
  );
  await expect(
    page.getByRole('button', { name: /black confirms/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /white confirms/i }),
  ).toBeVisible();
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

test('keeps the local play board fully visible on desktop viewports', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await useEnglish(page);

  await startLocalMatch(page, 'go');
  await expectBoardFullyInViewport(page);
  await expectBoardCoordinatesAligned(page);
  await expectDocumentOverflowWithin(page, LAYOUT_TOLERANCE_PX);

  await startLocalMatch(page, 'gomoku');
  await expectBoardFullyInViewport(page);
  await expectBoardCoordinatesAligned(page);
  await expectDocumentOverflowWithin(page, LAYOUT_TOLERANCE_PX);
});

test('keeps the local play board fully visible on mobile viewports', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useEnglish(page);

  // Mobile may scroll the sidebar below the board; the board must stay in view.
  await startLocalMatch(page, 'go');
  await expectBoardFullyInViewport(page);
  await expectBoardCoordinatesAligned(page);

  await startLocalMatch(page, 'gomoku');
  await expectBoardFullyInViewport(page);
  await expectBoardCoordinatesAligned(page);
});

test('supports keyboard play through the board grid semantics', async ({
  page,
}) => {
  await useEnglish(page);

  await clickLocalLink(page, '/setup/gomoku');
  await page.getByRole('button', { name: /start local match/i }).click();

  const board = page.getByTestId('game-board');
  await expect(board).toBeVisible();
  await expect(board).toHaveAttribute('role', 'grid');
  await expect(board).toHaveAttribute('tabindex', '0');
  await expect(board).toHaveAttribute('aria-rowcount', '15');
  await expect(board).toHaveAttribute('aria-colcount', '15');
  await expect(board).toHaveAttribute(
    'aria-activedescendant',
    'game-board-point-7-7',
  );

  await board.focus();
  await board.press('ArrowRight');
  await expect(board).toHaveAttribute(
    'aria-activedescendant',
    'game-board-point-8-7',
  );
  await expect(page.locator('#game-board-point-8-7')).toHaveAttribute(
    'role',
    'gridcell',
  );
  await expect(page.locator('#game-board-point-8-7')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('#game-board-point-8-7')).toHaveAttribute(
    'aria-disabled',
    'false',
  );
  await expect(page.locator('#game-board-point-8-7')).toHaveAttribute(
    'aria-label',
    /empty intersection/,
  );

  await board.press('Enter');

  const selectedPoint = page.locator('#game-board-point-8-7');
  await expect(selectedPoint).toHaveAttribute('aria-label', /J8/);
  await expect(selectedPoint).toHaveAttribute('aria-label', /Black stone/);
  await expect(selectedPoint).toHaveAttribute('aria-disabled', 'true');
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

  const panelMetrics = await panel.evaluate((node) => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
  }));
  expect(panelMetrics.scrollHeight).toBeGreaterThan(panelMetrics.clientHeight);

  const beforeHeader = await header.boundingBox();
  await panel.evaluate((node) => {
    node.scrollTop = 480;
    node.dispatchEvent(new Event('scroll'));
  });
  const afterScrollTop = await panel.evaluate((node) => node.scrollTop);
  const afterHeader = await header.boundingBox();

  expect(afterScrollTop).toBeGreaterThan(0);
  expect(Math.abs((beforeHeader?.y ?? 0) - (afterHeader?.y ?? 0))).toBeLessThan(
    4,
  );
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

async function clickLocalLink(
  page: Page,
  href: '/setup/go' | '/setup/gomoku',
): Promise<void> {
  await page
    .locator(`a[href="${href}"]`)
    .evaluate((node: HTMLAnchorElement) => node.click());
}

async function startLocalMatch(
  page: Page,
  mode: 'go' | 'gomoku',
): Promise<void> {
  await page.goto('/');
  await clickLocalLink(page, `/setup/${mode}`);

  if (mode === 'go') {
    await page.getByTestId('setup-nigiri-odd-button').click();
    await expect(page.getByTestId('setup-nigiri-result')).toContainText(
      /starts as Black/i,
    );
  }

  await page.getByRole('button', { name: /start local match/i }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();
}

async function expectBoardFullyInViewport(page: Page): Promise<void> {
  const board = page.getByTestId('game-board');
  const box = await board.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();

  if (!box || !viewport) {
    return;
  }

  expect(box.width).toBeGreaterThan(MIN_LOCAL_BOARD_SIZE_PX);
  expect(box.height).toBeGreaterThan(MIN_LOCAL_BOARD_SIZE_PX);
  expect(box.x).toBeGreaterThanOrEqual(-LAYOUT_TOLERANCE_PX);
  expect(box.y).toBeGreaterThanOrEqual(-LAYOUT_TOLERANCE_PX);
  expect(box.x + box.width).toBeLessThanOrEqual(
    viewport.width + LAYOUT_TOLERANCE_PX,
  );
  expect(box.y + box.height).toBeLessThanOrEqual(
    viewport.height + LAYOUT_TOLERANCE_PX,
  );
}

async function expectBoardCoordinatesAligned(page: Page): Promise<void> {
  const alignment = await page.getByTestId('game-board').evaluate((board) => {
    const boardSize = Number(board.getAttribute('aria-colcount'));
    const bottomLabels = Array.from(
      board.querySelectorAll<HTMLElement>(
        '[data-testid="board-coordinates-bottom"] span',
      ),
    );
    const leftLabels = Array.from(
      board.querySelectorAll<HTMLElement>(
        '[data-testid="board-coordinates-left"] span',
      ),
    );
    const boardPixels = 52 * 2 + 60 * (boardSize - 1);
    const expectedOffsetPercentages = Array.from(
      { length: boardSize },
      (_, index) => ((52 + index * 60) / boardPixels) * 100,
    );
    const bottomDeltas = bottomLabels.map((label, index) =>
      Math.abs(parseFloat(label.style.left) - expectedOffsetPercentages[index]),
    );
    const leftDeltas = leftLabels.map((label, index) =>
      Math.abs(parseFloat(label.style.top) - expectedOffsetPercentages[index]),
    );

    return {
      boardSize,
      bottomLabelCount: bottomLabels.length,
      leftLabelCount: leftLabels.length,
      maxDelta: Math.max(...bottomDeltas, ...leftDeltas),
    };
  });

  expect(alignment.bottomLabelCount).toBe(alignment.boardSize);
  expect(alignment.leftLabelCount).toBe(alignment.boardSize);
  expect(alignment.maxDelta).toBeLessThanOrEqual(
    COORDINATE_ALIGNMENT_TOLERANCE_PERCENT,
  );
}

async function expectDocumentOverflowWithin(
  page: Page,
  tolerancePx: number,
): Promise<void> {
  const scrollOverflow = await page.evaluate(() => {
    const root = document.scrollingElement;

    return root ? root.scrollHeight - window.innerHeight : 0;
  });

  expect(scrollOverflow).toBeLessThanOrEqual(tolerancePx);
}
