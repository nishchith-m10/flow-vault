# FlowVault Setup - Supabase & Clerk Configuration

## Environment Setup Complete ✅

All infrastructure setup is complete. Follow the steps below to finalize your environment.

---

## 🔐 Clerk Authentication Setup

### 1. Get Your Clerk API Keys

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application (or create a new one)
3. Navigate to **API Keys** page
4. Copy your **Publishable Key** and **Secret Key**

### 2. Update `.env.local`

Replace the Clerk placeholders in your `.env.local` file:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
CLERK_SECRET_KEY=sk_test_your_actual_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### 3. Configure Clerk Dashboard

In your Clerk Dashboard:

- **Paths → After sign-in** → Set to `/workflows`
- **Paths → After sign-up** → Set to `/workflows`
- **Sessions → Session token template** → Leave default

---

## 🗄️ Supabase Database Setup

### 1. Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Navigate to **Settings → API**
4. Copy:
   - **Project URL**
   - **anon/public key**
   - **service_role key** (⚠️ Keep this secret!)
5. Note your **Project Ref** from **Settings → General**

### 2. Update `.env.local`

Replace the Supabase placeholders in your `.env.local` file:

```bash
# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_PROJECT_REF=your-project-ref
```

### 3. Run Database Migration

#### Option A: Using Supabase Dashboard (Recommended for Quick Setup)

1. Go to your Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **Run** (or press `Ctrl+Enter`)

#### Option B: Using Supabase CLI (Recommended for Production)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your local project to your Supabase project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 4. Verify Database Setup

After running the migration, verify in Supabase Dashboard → **Table Editor**:

You should see these tables:
- ✅ `user_settings`
- ✅ `workflow_backups`
- ✅ `archived_workflows`
- ✅ `trash`
- ✅ `agent_audit_log`
- ✅ `workflow_tags`
- ✅ `rate_limit_counters`

### 5. Enable Row Level Security (RLS)

The migration automatically enables RLS on all tables. Verify:

1. Go to **Authentication → Policies**
2. Confirm each table has policies enabled
3. No action needed if policies are visible

---

## 🔒 Encryption Key (Already Generated)

Your `ENCRYPTION_KEY` is already set in `.env.local`. This key encrypts user n8n API credentials in the database.

**⚠️ CRITICAL:** 
- Never commit this key to Git
- Back it up securely (password manager, vault, etc.)
- If lost, encrypted credentials cannot be recovered

---

## 🚀 Optional: Additional Services

### GitHub Token (For Agent Automation)
```bash
GITHUB_TOKEN=ghp_your_github_personal_access_token
```

### Upstash Redis (For Rate Limiting)
1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy **REST URL** and **REST Token**

```bash
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### Sentry (For Error Monitoring)
```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

---

## ✅ Verification Checklist

Run this command to verify your environment:

```bash
node scripts/check_env.js
```

**Expected output:**
- ✅ All required variables should be green
- ⚠️ Optional variables may be yellow (this is okay for development)

---

## 🧪 Test Your Setup

Start the development server:

```bash
npm run dev
```

Visit `http://localhost:3000`:

1. You should see Clerk's sign-in/sign-up buttons
2. Create a test account
3. After sign-in, you should be redirected to `/workflows`

---

## 🛠️ Troubleshooting

### "Missing Supabase environment variables" Error
- Verify `.env.local` has all `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` variables
- Restart dev server after updating `.env.local`

### "Missing Clerk environment variables" Error
- Verify `.env.local` has `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- Restart dev server

### Database Connection Issues
- Verify Supabase Project URL is correct (check for typos)
- Ensure your IP is allowed (Supabase → Settings → Database → Connection pooling)
- Check Supabase project is active (not paused)

### Clerk Auth Not Working
- Verify middleware.ts exists at project root
- Check Clerk Dashboard paths are configured correctly
- Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_`
- Ensure `CLERK_SECRET_KEY` starts with `sk_`

---

## 📚 Next Steps

Once setup is verified:

1. ✅ Environment configured
2. ✅ Database schema created
3. ✅ Authentication working

**You're ready to proceed with feature implementation!**

See implementation strategy documentation for next steps.
