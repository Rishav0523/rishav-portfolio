export type Env = {
  DB: D1Database;
  MEDIA?: R2Bucket;
  SITE_URL?: string;
  ADMIN_PASSWORD_HASH?: string;
  SESSION_SECRET?: string;
  TURNSTILE_SECRET?: string;
  GITHUB_TOKEN?: string;
  GITHUB_REPO?: string;
};
