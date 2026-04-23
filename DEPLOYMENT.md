# Midicare Deployment Checklist (GitHub + Vercel)

## 1) Pre-deployment checklist

- [ ] Project builds locally:
  ```bash
  npm install
  npm run build
  ```
- [ ] Prisma client generates successfully:
  ```bash
  npx prisma generate
  ```
- [ ] Supabase PostgreSQL `DATABASE_URL` is valid and reachable.
- [ ] All required environment variables are ready.

---

## 2) Push project to GitHub

```bash
git init
git add .
git commit -m "Prepare Midicare for Vercel deployment"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

> If repository already exists, just commit and push to your current branch.

---

## 3) Import project to Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository.
3. Framework preset should be detected as **Next.js**.
4. Keep build settings default (or use values from `vercel.json`).
5. Add required Environment Variables (below) before deploy.
6. Click **Deploy**.

---

## 4) Required Environment Variables in Vercel

Set these in **Project Settings → Environment Variables**:

### Database / Supabase
- `DATABASE_URL`  
  - Must be your working Supabase Postgres connection string.
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Authentication / Session
- `JWT_SECRET` (strong random secret)

### Email (if password reset is used)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

---

## 5) Prisma production notes

Use one of these strategies:

### Option A (recommended for first deploy): `db push`
Run once against production DB:
```bash
npx prisma db push
```

### Option B (for strict migration workflow): `migrate deploy`
If your migrations are fully aligned with the production DB:
```bash
npx prisma migrate deploy
```

---

## 6) Post-deployment checks

- [ ] Open deployed URL.
- [ ] Verify home page renders.
- [ ] Verify login/register routes.
- [ ] Verify API route health (e.g., auth/session).
- [ ] Verify database-backed actions (create/read entities).
- [ ] Verify password reset email flow (if enabled).

---

## 7) Rollback plan

- Re-deploy previous successful deployment from Vercel dashboard.
- Revert problematic commit in GitHub and push fix.
- If schema caused issues, restore DB backup before re-deploy.

---

## 8) Common issues and fixes

### Prisma `P1001` (cannot reach DB)
- Check `DATABASE_URL` host/port.
- Ensure URL is complete and password is URL-encoded.
- Use correct Supabase connection string format.

### Build fails on Vercel with Prisma client issues
- Ensure `postinstall: "prisma generate"` exists in `package.json`.
- Ensure schema path is `prisma/schema.prisma`.

### Missing environment variable errors
- Confirm variable names exactly match code references.
- Add variables to all required environments (Production/Preview/Development).
