import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { Client } from "pg";

const BASE_BACKEND = "http://localhost:8080";
const ORIGIN = "http://localhost:5173";

async function login(page: Page) {
  await page.goto("/");
  await page.getByRole("textbox").first().fill(process.env.SMOKE_USER || "admin");
  await page.locator('input[type="password"]').first().fill(process.env.SMOKE_PASS || "admin123");
  await page.getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page.getByText("Projeler")).toBeVisible();
}

async function createProject(page: Page, name: string) {
  await page.getByRole("button", { name: /Proje Oluştur|Yeni Proje/ }).click();
  await page.locator("#proj-name").fill(name);
  await page.locator("#proj-desc").fill("Smoke test project");
  await page.getByRole("button", { name: "Oluştur" }).click();
  // Wait for project to appear in list, then navigate
  const projectLink = page.getByRole("link", { name });
  await expect(projectLink).toBeVisible({ timeout: 10000 });
  await projectLink.click();
  await expect(page).toHaveURL(/\/projects\/\d+/);
  // Verify project name is visible somewhere on the page (sidebar or heading)
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
  return Number(page.url().split("/projects/")[1]?.split("?")[0]);
}

async function backendCookieHeader(page: Page) {
  const cookies = await page.context().cookies(BASE_BACKEND);
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function openContextAndExpandScan(page: Page) {
  await page.reload();
  const baglamBtn = page.getByRole("button", { name: /Bağlam/ });
  await expect(baglamBtn).toBeVisible({ timeout: 10000 });
  await baglamBtn.click();
  // Wait for tab content to load
  await page.waitForTimeout(1000);
  const yerelKlasor = page.getByText("Yerel Klasör");
  if (!(await yerelKlasor.isVisible().catch(() => false))) {
    const advancedBtn = page.getByText(/Gelişmiş/);
    if (await advancedBtn.isVisible().catch(() => false)) {
      await advancedBtn.first().click();
    }
  }
  await expect(yerelKlasor).toBeVisible({ timeout: 5000 });
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
  if (!deleteResponse.ok()) {
    console.warn(`Cleanup failed for project ${projectId} (${deleteResponse.status()})`);
  }
}

test("login + create project + add requirement flow", async ({ page, request }) => {
  const projectName = `Smoke ${Date.now()}`;
  const requirementText = "Smoke test requirement: project creation and requirement intake flow";

  await login(page);
  const projectId = await createProject(page, projectName);
  const cookieHeader = await backendCookieHeader(page);

  await page.getByRole("button", { name: /Yeni Talep/ }).click();
  await page.locator("#req-text").fill(requirementText);
  await page.getByRole("button", { name: "Ekle" }).click();
  await expect(page.getByText(requirementText)).toBeVisible();

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
  await expect(page.getByText(/Tarama Geçmişi|Geçmiş/)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("FAILED")).toBeVisible({ timeout: 5000 });
  await page.getByText("FAILED").first().click();
  await expect(page.getByText(projectIdErrorText)).toBeVisible();

  await cleanupProject(request, projectId, projectName, cookieHeader);
});
