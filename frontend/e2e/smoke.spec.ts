import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { Client } from "pg";

const BASE_BACKEND = "http://localhost:8080";
const ORIGIN = "http://localhost:5173";

async function login(page: Page) {
  await page.goto("/");
  await page.getByRole("textbox").first().fill(process.env.SMOKE_USER || "admin");
  await page.locator('input[type="password"]').first().fill(process.env.SMOKE_PASS || "admin123");
  await page.getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page.getByRole("heading", { name: "Projeler" })).toBeVisible();
}

async function createProject(page: Page, name: string) {
  await page.getByRole("button", { name: "Yeni Proje" }).click();
  await page.locator("#proj-name").fill(name);
  await page.locator("#proj-desc").fill("Smoke test project");
  await page.getByRole("button", { name: "Oluştur" }).click();
  const projectLink = page.getByRole("link", { name });
  await expect(projectLink).toBeVisible();
  await projectLink.click();
  await expect(page).toHaveURL(/\/projects\/\d+/);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  return Number(page.url().split("/projects/")[1]?.split("?")[0]);
}

async function backendCookieHeader(page: Page) {
  const cookies = await page.context().cookies(BASE_BACKEND);
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function openContextAndExpandScan(page: Page) {
  await page.reload();
  await page.getByRole("button", { name: "Bağlam" }).click();
  await page.locator("text=Kaynak Kod").first().click();
}

async function cleanupProject(request: APIRequestContext, projectId: number, projectName: string, cookieHeader: string) {
  if ((process.env.SMOKE_CLEANUP || "false").toLowerCase() !== "true") return;
  const deleteResponse = await request.delete(`${BASE_BACKEND}/api/v1/projects/${projectId}`, {
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      Cookie: cookieHeader,
    },
    data: { confirmName: projectName },
  });
  expect(deleteResponse.ok()).toBeTruthy();
}

test("login + create project + add requirement flow", async ({ page, request }) => {
  const projectName = `Smoke ${Date.now()}`;
  const requirementText = "Smoke test requirement: project creation and requirement intake flow";

  await login(page);
  const projectId = await createProject(page, projectName);
  const cookieHeader = await backendCookieHeader(page);

  await page.getByRole("button", { name: "Yeni Talep" }).click();
  await page.locator("#req-text").fill(requirementText);
  await page.getByRole("button", { name: "Ekle" }).click();
  await expect(page.getByText(requirementText)).toBeVisible();

  const seeded = await request.post(`${BASE_BACKEND}/api/v1/projects/${projectId}/context-freshness/partial-refresh`, {
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      Cookie: cookieHeader,
    },
    data: { force: true, maxAnalyses: 1 },
  });
  expect(seeded.ok()).toBeTruthy();

  await openContextAndExpandScan(page);
  await expect(page.getByText("Son Kısmi Yenileme Denemeleri")).toBeVisible();

  await cleanupProject(request, projectId, projectName, cookieHeader);
});

test("partial refresh FAILED entry is visible in timeline", async ({ page, request }) => {
  const projectName = `SmokeFail ${Date.now()}`;
  const projectIdErrorText = "Simulated failure from smoke test";

  await login(page);
  const projectId = await createProject(page, projectName);
  const cookieHeader = await backendCookieHeader(page);

  const client = new Client({
    host: process.env.SMOKE_DB_HOST || "localhost",
    port: Number(process.env.SMOKE_DB_PORT || "5432"),
    user: process.env.SMOKE_DB_USER || "scopesmith",
    password: process.env.SMOKE_DB_PASSWORD || "scopesmith_dev",
    database: process.env.SMOKE_DB_NAME || "scopesmith",
  });
  await client.connect();
  await client.query(
    `INSERT INTO partial_refresh_jobs
       (project_id, status, recommendation, total_analyses, processed_analyses, refreshed_count, refreshed_requirement_ids, error, started_at, completed_at)
     VALUES
       ($1, 'FAILED', 'PARTIAL_REFRESH', 1, 0, 0, $2::jsonb, $3, NOW(), NOW())`,
    [projectId, "[]", projectIdErrorText],
  );
  await client.end();

  await openContextAndExpandScan(page);
  await expect(page.getByText("Son Kısmi Yenileme Denemeleri")).toBeVisible();
  await expect(page.getByText("FAILED")).toBeVisible();
  await page.getByText("FAILED").first().click();
  await expect(page.getByText(projectIdErrorText)).toBeVisible();

  await cleanupProject(request, projectId, projectName, cookieHeader);
});
