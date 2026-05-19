// ══════════════════════════════════════════════════════════════════
// BrightDays — Supabase Configuration
// ══════════════════════════════════════════════════════════════════
//
// HOW TO GET YOUR KEYS (5 minutes):
//
//  1. Go to https://supabase.com → "Start your project" → sign up free
//  2. Click "New project" → name it "brightdays" → set a DB password → Create
//  3. Once loaded, go to Settings → API
//  4. Copy "Project URL"   → paste below as SUPABASE_URL
//  5. Copy "anon / public" → paste below as SUPABASE_ANON_KEY
//  6. That's it. Run npm install @supabase/supabase-js then uncomment everything below.
//
// ── PASTE YOUR VALUES HERE ────────────────────────────────────────

export const SUPABASE_URL  = "https://YOUR_PROJECT_ID.supabase.co";
export const SUPABASE_ANON = "YOUR_ANON_KEY_HERE";

// ── UNCOMMENT THIS BLOCK AFTER npm install @supabase/supabase-js ─

// import { createClient } from "@supabase/supabase-js";
// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── HOW IT REPLACES THE IN-MEMORY STATE ──────────────────────────
//
// Currently BrightDays stores everything in React useState — data
// resets on every page refresh. Supabase replaces each state array
// with a real database table.  Here is the mapping:
//
//  React state          → Supabase table       Notes
//  ─────────────────────────────────────────────────────────────
//  INIT_USERS           → users                Use Supabase Auth instead
//  INIT_ORGS            → orgs                 Add row-level security
//  INIT_CHILDREN        → children             Add org_id FK column
//  INIT_INCIDENTS       → incidents            Add org_id FK column
//  INIT_PHOTOS          → photos               imageData → Supabase Storage URL
//  INIT_MESSAGES        → messages             Add org_id FK column
//  INIT_INVOICES        → invoices             Add org_id FK column
//  INIT_DAILY_REPORTS   → daily_reports        Add org_id FK column
//  INIT_CONSENTS        → consents             Add org_id FK column
//
// ── STEP-BY-STEP MIGRATION (do these in Supabase SQL editor) ─────
//
// 1. CREATE TABLE orgs (
//      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//      name text NOT NULL,
//      plan text DEFAULT 'basic',
//      students int DEFAULT 0,
//      monthly_fee int DEFAULT 49,
//      status text DEFAULT 'active',
//      stripe_active boolean DEFAULT false,
//      created_at timestamptz DEFAULT now()
//    );
//
// 2. CREATE TABLE children (
//      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//      org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
//      name text NOT NULL,
//      room text,
//      allergies text DEFAULT 'None',
//      status text DEFAULT 'checked-out',
//      dob date,
//      avatar text DEFAULT '🌸',
//      notes text,
//      xp int DEFAULT 0,
//      level int DEFAULT 1,
//      streak int DEFAULT 0,
//      badges text[] DEFAULT '{}',
//      created_at timestamptz DEFAULT now()
//    );
//
// 3. Enable Row Level Security on each table:
//    ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
//    ALTER TABLE children ENABLE ROW LEVEL SECURITY;
//    -- Repeat for all tables
//
// 4. Create policies so each org only sees its own data:
//    CREATE POLICY "org members only" ON children
//      USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
//
// ── REPLACING LOGIN (auth) ────────────────────────────────────────
//
//  Replace the login() function in BrightDays.jsx with:
//
//  const login = async () => {
//    const { data, error } = await supabase.auth.signInWithPassword({
//      email: emailInput,
//      password: pwInput,
//    });
//    if (error) { setLoginErr("Wrong credentials."); return; }
//    setUser(data.user);
//    setTab("dashboard");
//  };
//
// ── REPLACING DATA FETCH ─────────────────────────────────────────
//
//  Replace INIT_CHILDREN with a useEffect in App:
//
//  useEffect(() => {
//    supabase.from("children").select("*")
//      .then(({ data }) => { if (data) setChildren(data); });
//  }, [user]);
//
// ── REPLACING PHOTO UPLOAD ────────────────────────────────────────
//
//  When staff uploads a photo:
//  const { data } = await supabase.storage
//    .from("photos")
//    .upload(`${orgId}/${Date.now()}.jpg`, file);
//  const url = supabase.storage.from("photos").getPublicUrl(data.path).data.publicUrl;
//  // Save url into the photos table instead of base64
//
// ─────────────────────────────────────────────────────────────────
// Once connected, your data survives refreshes, is isolated per org,
// and scales to 10,000+ daycares without changes.
// ─────────────────────────────────────────────────────────────────
