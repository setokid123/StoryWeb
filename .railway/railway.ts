import { defineRailway, github, preserve, project, service } from "railway/iac";

// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "StoryWeb";

export default defineRailway(() => {
  const StoryWeb = service("StoryWeb", {
    source: github("setokid123/StoryWeb", { branch: "main" }),
    env: {
      DATABASE_URL: "${{Postgres.DATABASE_URL}}",
      ADMIN_PANEL_PASSWORD: preserve(),
      ADMIN_SESSION_SECRET: preserve(),
      CLICK_UNLOCK_SECRET: preserve(),
      // Default-off in the app. Railway owns this flag so a test setting survives config apply.
      CLICK_UNLOCK_ENABLED: preserve(),
      SHOPEE_GATE_APPROVED: "false",
      NEXT_PUBLIC_SITE_URL: "https://storyweb-production.up.railway.app",
    },
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    preDeploy: "npm run db:migrate",
  });
  return project("StoryWeb", {
    resources: [StoryWeb],
  });
});
