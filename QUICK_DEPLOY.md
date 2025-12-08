# 🚀 Quick Deploy to Vercel (5 Minutes)

## Step 1: Deploy via Vercel Dashboard

1. **Click this button** → [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/willem4130/nextjs-fullstack-template&project-name=supply-chain-simulator&repository-name=supply-chain-simulator)

   OR manually:
   - Go to https://vercel.com/new
   - Import: `willem4130/nextjs-fullstack-template`
   - **Branch**: `phase1-foundation` ⚠️ Important!

2. **Configure Project**:
   - Project Name: `supply-chain-simulator`
   - Framework: Next.js (auto-detected)
   - Build Command: Leave default (uses vercel.json)

3. **Add Environment Variables**:
   
   Copy these exactly:
   
   ```
   NEXTAUTH_SECRET=HTjanxSyFzbPCOMR+NO5yQrSWHp5+HmCowumvsGjDAM=
   NEXTAUTH_URL=https://supply-chain-simulator.vercel.app
   ```
   
   ⚠️ **Important**: Update `NEXTAUTH_URL` with your actual Vercel URL after first deploy

4. **Click Deploy** → Wait ~2 minutes

## Step 2: Add Postgres Database

After successful deployment:

1. Go to your project dashboard
2. **Storage** tab → **Create Database**
3. Select **Postgres**
4. Name: `supply-chain-db`
5. Region: `us-east-1` (or closest to you)
6. **Create**

✅ Vercel automatically adds `DATABASE_URL` to your environment variables

## Step 3: Push Database Schema

In Vercel dashboard:

1. **Settings** → **Environment Variables**
2. Click on `DATABASE_URL` → **Copy value**
3. Go to **Storage** → your database → **Query**
4. Click **"Connect"** → Select **Prisma**
5. Copy the connection command and run in your terminal:

```bash
# This runs the Prisma schema push via Vercel
npx vercel env pull
npx prisma db push
```

OR use Vercel's built-in query tool:
- Copy schema from `prisma/schema.prisma`
- Vercel will execute migrations on next deployment

## Step 4: Update NEXTAUTH_URL

After first deployment:

1. Copy your production URL (e.g., `https://supply-chain-simulator.vercel.app`)
2. **Settings** → **Environment Variables**
3. Edit `NEXTAUTH_URL` → Paste your URL
4. **Deployments** → **Redeploy** (latest deployment)

## ✅ Done! Your App is Live

Visit: **https://your-app-name.vercel.app/admin/scenarios**

---

## What You Get

- ✅ Full Next.js app running on Vercel
- ✅ Postgres database connected
- ✅ Authentication configured (NextAuth)
- ✅ 8 tRPC routers ready
- ✅ Calculation engine ready to test
- ✅ Scenario management UI (with mock data)

---

## Next Steps

1. **Seed test data** (see `prisma/seed.ts` - coming next)
2. **Build Variable UI** to create INPUT/OUTPUT variables
3. **Test calculation engine** with real formulas
4. **Add user authentication** (login/signup pages)

---

## Troubleshooting

**Build fails**: Check build logs in Vercel dashboard
**Database errors**: Ensure `DATABASE_URL` is set
**Auth errors**: Verify `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are correct

---

**Your Production URL**: Will be shown after deployment completes
