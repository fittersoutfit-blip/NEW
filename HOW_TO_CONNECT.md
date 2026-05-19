# BrightDays — How to Connect Everything

**Three things to do before charging real money:**
1. Connect Supabase (data persistence + real auth)
2. Connect Stripe (real payments)
3. Mobile menu is already fixed ✅

---

## Fix #1 Already Done — Mobile Menu ✅

The hamburger menu on phones was broken (hidden by inline CSS).  
**Fixed in this session** — both `BrightDays_5.jsx` and `app/src/BrightDays.jsx` are updated.  
Upload both files to GitHub and redeploy to Vercel to get the fix live.

---

## Fix #2 — Connect Supabase (Data Persistence + Real Login)

**Why you need this:** Right now every page refresh wipes all data. Real daycares will lose kids, attendance, photos. Supabase is free up to ~500MB and 10,000 monthly active users — enough for your first 50 paying customers.

### Step 1 — Create your Supabase project (5 minutes)

1. Go to **https://supabase.com** → click **Start your project** → sign up free
2. Click **New project**
3. Fill in:
   - Name: `brightdays`
   - Database password: make a strong one, save it
   - Region: US East (closest to Illinois)
4. Click **Create new project** — wait 60 seconds for it to spin up

### Step 2 — Get your API keys (2 minutes)

1. In your Supabase project → click **Settings** (left sidebar gear icon)
2. Click **API**
3. Copy two values:
   - **Project URL** — looks like `https://abcxyz123.supabase.co`
   - **anon / public key** — long string starting with `eyJ...`

### Step 3 — Paste keys into the app

Open `app/src/supabase.js` (already created in your project folder) and replace:

```js
export const SUPABASE_URL  = "https://YOUR_PROJECT_ID.supabase.co";  // ← replace this
export const SUPABASE_ANON = "YOUR_ANON_KEY_HERE";                    // ← replace this
```

Then uncomment the bottom section:

```js
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
```

### Step 4 — Install the Supabase package

Open Terminal, navigate to your app folder, and run:

```bash
cd ~/Documents/Claude/Projects/Brightdays\ -Daycare/app
npm install @supabase/supabase-js
```

### Step 5 — Create your database tables

In Supabase → go to **SQL Editor** → click **New query** → paste and run each block:

**Create orgs table:**
```sql
CREATE TABLE orgs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  plan text DEFAULT 'basic',
  students int DEFAULT 0,
  monthly_fee int DEFAULT 49,
  status text DEFAULT 'active',
  stripe_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
```

**Create children table:**
```sql
CREATE TABLE children (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  room text,
  allergies text DEFAULT 'None',
  status text DEFAULT 'checked-out',
  dob date,
  avatar text DEFAULT '🌸',
  notes text,
  xp int DEFAULT 0,
  level int DEFAULT 1,
  streak int DEFAULT 0,
  badges text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
```

**Create incidents table:**
```sql
CREATE TABLE incidents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
  child_id uuid REFERENCES children(id),
  child_name text,
  category text,
  body_part text,
  what text,
  action text,
  staff text,
  severity text DEFAULT 'Minor',
  acknowledged boolean DEFAULT false,
  date text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
```

**Create photos table:**
```sql
CREATE TABLE photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
  child_id uuid REFERENCES children(id),
  child_name text,
  caption text,
  emoji text,
  staff text,
  image_url text,
  likes int DEFAULT 0,
  comments text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
```

### Step 6 — Enable Supabase Auth

1. In Supabase → **Authentication** → **Providers** → make sure **Email** is enabled
2. Go to **Authentication** → **Users** → **Invite user**
3. Add your first real director: enter their email → Send invite
4. They get an email to set their password → they can log in

> Once you do this, replace the `login()` function in `BrightDays_5.jsx` with:
> ```js
> import { supabase } from './supabase.js';
> 
> const login = async () => {
>   const { data, error } = await supabase.auth.signInWithPassword({
>     email: emailInput,
>     password: pwInput,
>   });
>   if (error) { setLoginErr("Wrong credentials."); return; }
>   setUser(data.user);
>   setTab("dashboard");
> };
> ```

### Step 7 — Enable photo storage

1. Supabase → **Storage** → **New bucket**
2. Name: `photos` → make it **Public** → Create
3. Photos uploaded by staff will now persist permanently

---

## Fix #3 — Connect Stripe (Real Payments)

**Why you need this:** Right now clicking "Upgrade" just changes the plan in memory. To actually collect $49–$129/month, you need Stripe.

### Step 1 — Create a Stripe account (10 minutes)

1. Go to **https://stripe.com** → click **Start now** → sign up
2. Complete your profile (name, business type, bank account for payouts)
3. You start in **Test Mode** — no real money until you go live

### Step 2 — Create your 3 products

In Stripe Dashboard → **Products** → **+ Add product**

Create these one at a time:

| Product name | Price | Billing |
|---|---|---|
| BrightDays Basic | $49.00 | Monthly recurring |
| BrightDays Plus | $79.00 | Monthly recurring |
| BrightDays Premium | $129.00 | Monthly recurring |

For each: fill in Name → set Price → set recurring monthly → **Save product**

### Step 3 — Create a Buy Button for each plan

For each product:
1. Open the product → click **Create payment link**
2. In the popup, click the **"Buy button"** tab
3. Set **Success URL** to:
   - Basic: `https://your-vercel-url.vercel.app/?payment=success&plan=basic`
   - Plus: `https://your-vercel-url.vercel.app/?payment=success&plan=plus`
   - Premium: `https://your-vercel-url.vercel.app/?payment=success&plan=premium`
4. Set **Cancel URL** to: `https://your-vercel-url.vercel.app/?payment=cancel`
5. Copy the **buy-button-id** (looks like `buy_btn_1ABC123...`)
6. Copy the **Payment Link URL** (looks like `https://buy.stripe.com/test_...`)

### Step 4 — Get your Publishable Key

Stripe Dashboard → **Developers** → **API keys** → copy **Publishable key**  
(starts with `pk_test_...` for test, `pk_live_...` for production)

### Step 5 — Paste everything into the app

Open `BrightDays_5.jsx` (and `app/src/BrightDays.jsx`) — find the `STRIPE` block near the top (around line 46) and fill it in:

```js
const STRIPE = {
  publishableKey: "pk_live_YOUR_KEY_HERE",   // ← paste your publishable key

  plans: {
    basic: {
      buyButtonId:  "buy_btn_YOUR_BASIC_ID",              // ← paste basic buy button ID
      paymentLink:  "https://buy.stripe.com/YOUR_BASIC",  // ← paste basic payment link
      price: 49,
    },
    plus: {
      buyButtonId:  "buy_btn_YOUR_PLUS_ID",
      paymentLink:  "https://buy.stripe.com/YOUR_PLUS",
      price: 79,
    },
    premium: {
      buyButtonId:  "buy_btn_YOUR_PREMIUM_ID",
      paymentLink:  "https://buy.stripe.com/YOUR_PREMIUM",
      price: 129,
    },
  },

  live: true,   // ← CHANGE THIS FROM false TO true

  isReady: (planKey) => { ... },  // leave this unchanged
};
```

### Step 6 — Go live on Stripe

When you're ready to charge real money (not test mode):
1. Stripe Dashboard → top left → toggle from **Test** to **Live**
2. Repeat Steps 2–4 in Live mode (test and live products are separate)
3. Replace your keys with the `pk_live_...` version

---

## Redeploy to Vercel after any change

Whenever you update files:
1. Drag the updated file(s) onto GitHub (your repo → navigate to file → upload)
2. Vercel auto-deploys on every GitHub push — your site updates in ~60 seconds

Or run the deploy script:
```bash
cd ~/Documents/Claude/Projects/Brightdays\ -Daycare
bash DEPLOY_NOW.sh
```

---

## Revenue you can make with this setup

| Daycares | Plan mix | Monthly |
|---|---|---|
| 5 customers | All Plus ($79) | $395/mo |
| 10 customers | Mixed avg ($80) | $800/mo |
| 20 customers | Mixed avg ($80) | $1,600/mo |
| 50 customers | Mixed avg ($85) | $4,250/mo |

Schaumburg IL metro area has 300+ licensed childcare centers. You need just 10 to hit $800/month recurring.

---

*Last updated: May 2026 — BrightDays SaaS Platform*
