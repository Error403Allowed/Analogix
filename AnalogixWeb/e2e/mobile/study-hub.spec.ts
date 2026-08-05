import { test, expect, assertNoHorizontalOverflow } from "./fixtures/auth-stub";

const EXPECTED_TOOLS = [
  { label: "Flashcards", path: "/flashcards" },
  { label: "Quiz", path: "/quiz" },
  { label: "Calendar", path: "/calendar" },
  { label: "Formulas", path: "/formulas" },
  { label: "Timer", path: "/timer" },
  { label: "Resources", path: "/resources" },
];

test.describe("Study hub", () => {
  test("renders all six tool tiles", async ({ page }) => {
    await page.goto("/study", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Study Hub" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("study-tool")).toHaveCount(6);
  });

  test("each tool tile links to its route", async ({ page }) => {
    await page.goto("/study", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("study-tool")).toHaveCount(6, { timeout: 15000 });
    for (const tool of EXPECTED_TOOLS) {
      const tile = page.getByTestId("study-tool").filter({ hasText: tool.label });
      await expect(tile).toHaveAttribute("href", tool.path);
    }
  });

  test("navigates to a tool when tapped", async ({ page }) => {
    await page.goto("/study", { waitUntil: "domcontentloaded" });
    const quiz = page.getByTestId("study-tool").filter({ hasText: "Quiz" });
    await expect(quiz).toBeVisible({ timeout: 15000 });
    await quiz.tap();
    await expect(page).toHaveURL(/\/quiz$/, { timeout: 15000 });
  });

  test("has no horizontal overflow", async ({ page }) => {
    await page.goto("/study", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("study-tool")).toHaveCount(6, { timeout: 15000 });
    await assertNoHorizontalOverflow(page);
  });
});
