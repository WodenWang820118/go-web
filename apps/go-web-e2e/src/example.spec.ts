import { expect, test } from '@playwright/test';

test('starts a Go match and completes a scoring flow', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'Start local Go', exact: true }).click();
  await expect(page.getByTestId('setup-form')).toBeVisible();

  await page.getByRole('button', { name: /start local match/i }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();

  await page.getByRole('button', { name: 'Pass' }).click();
  await page.getByRole('button', { name: 'Pass' }).click();
  await expect(page.getByText(/scoring phase started/i)).toBeVisible();

  await page.getByRole('button', { name: /finalize score/i }).click();
  await expect(page.getByRole('dialog', { name: /match result/i })).toBeVisible();
  await expect(
    page.getByRole('dialog', { name: /match result/i }).getByText(/wins by/i)
  ).toBeVisible();
});

test('starts a Gomoku match and creates five in a row', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'Start local Gomoku', exact: true }).click();
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

  await expect(page.getByRole('dialog', { name: /match result/i })).toBeVisible();
  await expect(
    page.getByRole('dialog', { name: /match result/i }).getByText(/five in a row/i)
  ).toBeVisible();
});

test('renders the flow on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /go and gomoku/i })).toBeVisible();
  await page.getByRole('link', { name: 'Start local Go', exact: true }).click();
  await page.getByRole('button', { name: /start local match/i }).click();

  await expect(page.getByTestId('game-board')).toBeVisible();
  await expect(page.getByText(/current turn/i)).toBeVisible();
});
