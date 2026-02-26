# LAUTECH Rentals - Setup Guide

## Tech Stack
- **Frontend:** React + Shadcn/UI + TailwindCSS
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Payments:** KoralPay

---

## Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon Key**: Found in Settings → API → `anon public`
   - **Service Role Key**: Found in Settings → API → `service_role` (keep secret!)

### 1.2 Run Database Schema
1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `/app/supabase_schema.sql`
3. Run the SQL to create all tables, indexes, and RLS policies

### 1.3 Create Storage Buckets
1. Go to Storage in Supabase Dashboard
2. Create bucket: `property-images` (Public)
3. Create bucket: `verification-docs` (Private)

---

## Step 2: Environment Configuration

### Backend (.env)
```env
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_KEY="your-service-role-key"
KORALPAY_PUBLIC_KEY="pk_test_xxx"
KORALPAY_SECRET_KEY="sk_test_xxx"
KORALPAY_WEBHOOK_SECRET="whsec_xxx"
CORS_ORIGINS="*"
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL="https://your-backend-url.com"
REACT_APP_SUPABASE_URL="https://your-project-id.supabase.co"
REACT_APP_SUPABASE_ANON_KEY="your-anon-key"
```

---

## Step 3: KoralPay Setup

### 3.1 Create KoralPay Account
1. Go to [korapay.com](https://korapay.com)
2. Create a merchant account
3. Get your API keys from the dashboard

### 3.2 Configure Webhook
1. In KoralPay dashboard, add webhook URL:
   ```
   https://your-backend-url.com/api/webhooks/koralpay
   ```
2. Note the webhook secret and add to `.env`

---

## Step 4: Create Admin Account

1. Register a normal account through the app
2. Run this SQL in Supabase SQL Editor:
   ```sql
   UPDATE public.users 
   SET role = 'admin' 
   WHERE email = 'your-admin@email.com';
   ```

---

## Step 5: Deployment

### Vercel Deployment (Recommended)
1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Manual Deployment
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend
cd frontend
yarn install
yarn build
# Serve the build folder
```

---

## Test Accounts

After setup, you can create test accounts:

| Role | Steps |
|------|-------|
| **User** | Register normally |
| **Agent** | Register → Submit verification → Admin approves |
| **Admin** | Register → Update role via SQL |

---

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Properties
- `GET /api/properties` - List approved properties
- `POST /api/properties` - Create property (agent/admin)
- `GET /api/properties/{id}` - Get property details
- `POST /api/properties/{id}/unlock` - Unlock contact

### Tokens
- `GET /api/wallet` - Get wallet balance
- `POST /api/tokens/purchase` - Initiate purchase

### Inspections
- `POST /api/inspections` - Request inspection
- `GET /api/inspections` - My inspections
- `PUT /api/inspections/{id}` - Update inspection

### Admin
- `GET /api/admin/stats` - Dashboard stats
- `GET /api/users` - List all users
- `PUT /api/users/{id}/role` - Update user role

---

## Troubleshooting

### Common Issues

1. **CORS errors**: Check `CORS_ORIGINS` in backend `.env`
2. **Auth not working**: Verify Supabase keys are correct
3. **RLS blocking queries**: Use service role key for admin operations
4. **Payment not updating**: Check webhook URL and secret

### Testing Payments
Use the simulate endpoint for testing:
```bash
POST /api/payments/simulate/{reference}
```

---

## Support
For issues, check:
- Supabase logs in Dashboard → Logs
- Backend logs in your hosting platform
- Browser console for frontend errors
