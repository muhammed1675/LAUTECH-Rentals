# LAUTECH Rentals - Vercel Deployment Guide

## Architecture (Frontend-Only for Vercel)
- **Frontend:** React connects directly to Supabase
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Payments:** KoralPay

---

## Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key**: Settings → API → `anon public`

### 1.2 Run Database Schema
1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `/app/supabase_schema.sql`
3. Run the SQL

### 1.3 Create Storage Buckets
1. Go to Storage in Supabase Dashboard
2. Create bucket: `property-images` (Public)
3. Create bucket: `verification-docs` (Private)

---

## Step 2: Vercel Deployment

### 2.1 Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/lautech-rentals.git
git push -u origin main
```

### 2.2 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset:** Create React App
   - **Root Directory:** `frontend`
   - **Build Command:** `yarn build`
   - **Output Directory:** `build`

### 2.3 Environment Variables (Add in Vercel Dashboard)
```
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_KORALPAY_PUBLIC_KEY=pk_test_xxx
```

---

## Step 3: Create Admin Account

1. Register through the app
2. Run this SQL in Supabase SQL Editor:
```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

---

## Step 4: KoralPay Webhook (Optional)

For payment verification, create a Supabase Edge Function:

1. Create Edge Function in Supabase Dashboard
2. Add webhook URL to KoralPay dashboard

---

## Environment Variables Summary

| Variable | Where to Get |
|----------|--------------|
| `REACT_APP_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `REACT_APP_KORALPAY_PUBLIC_KEY` | KoralPay Dashboard |

---

## Folder Structure for Vercel

```
/frontend/          ← Deploy this folder
├── public/
├── src/
│   ├── lib/
│   │   ├── supabase.js    ← Supabase client
│   │   ├── api.js         ← Direct Supabase calls
│   │   └── auth.js        ← Auth context
│   ├── pages/
│   └── components/
├── package.json
└── .env               ← Add env vars in Vercel, not here
```

---

## Testing Payments

For testing without real KoralPay:
1. Go to Buy Tokens page
2. Click "Pay" to create transaction
3. Use "Simulate Payment Success" button

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Auth not working | Check Supabase URL and Anon Key |
| Tables not found | Run SQL schema in Supabase |
| RLS errors | Ensure RLS policies are created |
| 404 on Vercel | Set Root Directory to `frontend` |
