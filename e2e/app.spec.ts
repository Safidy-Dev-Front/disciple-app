import { expect, test } from '@playwright/test';

test('affiche l’onglet Aujourd’hui avec l’objectif de 3 h', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByText('sur 03:00:00')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Démarrer' })).toBeVisible();
});
