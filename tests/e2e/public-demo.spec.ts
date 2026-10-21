import { expect, test } from "@playwright/test";

test("public landing page opens the fictional coach and client demos", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /every set.*every meal/i }),
  ).toBeVisible();
  await page.getByRole("link", { name: /try the live demo/i }).click();
  await expect(page).toHaveURL(/\/demo\/coach$/);
  await expect(
    page.getByRole("heading", { name: "Clients", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Changes stay in this browser tab and never touch real client data.",
    ),
  ).toBeVisible();

  await page.getByRole("link", { name: "Client", exact: true }).first().click();
  await expect(page).toHaveURL(/\/demo\/client$/);
  await expect(
    page.getByRole("heading", { name: "Today", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Everything below is safe to try. Your changes stay in this tab.",
    ),
  ).toBeVisible();
});
