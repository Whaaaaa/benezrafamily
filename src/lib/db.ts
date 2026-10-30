import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

const DEFAULT_CATEGORIES = [
  { id: 'rent',         name: 'Rent & Arnona',              budget_amount: 8000, sort_order: 0  },
  { id: 'childcare',    name: 'Childcare',                  budget_amount: 3700, sort_order: 1  },
  { id: 'car',          name: 'Car & Transportation',       budget_amount: 4400, sort_order: 2  },
  { id: 'electric',     name: 'Electricity',                budget_amount: 750,  sort_order: 3  },
  { id: 'water_gas',    name: 'Water & Gas',                budget_amount: 350,  sort_order: 4  },
  { id: 'groceries',    name: 'Groceries & Household',      budget_amount: 5000, sort_order: 5  },
  { id: 'kids_school',  name: 'Kids / School / Chugim',     budget_amount: 2000, sort_order: 6  },
  { id: 'health',       name: 'Health & Pharmacy',          budget_amount: 800,  sort_order: 7  },
  { id: 'phones',       name: 'Phones & Subscriptions',     budget_amount: 1000, sort_order: 8  },
  { id: 'eating_out',   name: 'Eating Out & Fun',           budget_amount: 1500, sort_order: 9  },
  { id: 'clothing',     name: 'Clothing & Personal',        budget_amount: 1500, sort_order: 10 },
  { id: 'holidays',     name: 'Holidays & Gifts',           budget_amount: 1200, sort_order: 11 },
  { id: 'emergency',    name: 'Emergency Fund',             budget_amount: 1200, sort_order: 12 },
  { id: 'house_savings',name: 'Home Savings',               budget_amount: 5250, sort_order: 13 },
]

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      name TEXT NOT NULL
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      quantity TEXT NOT NULL DEFAULT '',
      checked BOOLEAN NOT NULL DEFAULT FALSE,
      meal_id TEXT NOT NULL DEFAULT ''
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS budget_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      budget_amount NUMERIC NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS manual_transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      category_id TEXT NOT NULL DEFAULT '',
      is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
      recurring_day INTEGER
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS period_dates (
      date TEXT PRIMARY KEY
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS cc_transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      category_id TEXT NOT NULL DEFAULT '',
      month TEXT NOT NULL
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS description_mappings (
      description TEXT PRIMARY KEY,
      category_id TEXT NOT NULL
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS chugim (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      child TEXT NOT NULL,
      days TEXT NOT NULL DEFAULT '[]',
      time TEXT NOT NULL DEFAULT '',
      monthly_cost NUMERIC NOT NULL DEFAULT 0
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'orange'
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_amount NUMERIC NOT NULL DEFAULT 0,
      emoji TEXT NOT NULL DEFAULT '🎯',
      color TEXT NOT NULL DEFAULT 'emerald'
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS savings_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      balance NUMERIC NOT NULL DEFAULT 0
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS meal_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS meal_template_ingredients (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity TEXT NOT NULL DEFAULT ''
    )
  `
  await sql`ALTER TABLE meals ADD COLUMN IF NOT EXISTS template_id TEXT NOT NULL DEFAULT ''`
  await sql`ALTER TABLE savings_accounts ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'ILS'`
  await sql`ALTER TABLE savings_accounts ADD COLUMN IF NOT EXISTS goal_id TEXT`
  await sql`
    INSERT INTO savings_goals (id, name, target_amount, emoji, color)
    VALUES ('retirement', 'Retirement', 5000000, '🌅', 'violet'),
           ('house', 'House', 300000, '🏠', 'emerald')
    ON CONFLICT (id) DO NOTHING
  `
  await sql`ALTER TABLE manual_transactions ADD COLUMN IF NOT EXISTS chug_id TEXT`
  await sql`ALTER TABLE manual_transactions ADD COLUMN IF NOT EXISTS recurring_interval TEXT DEFAULT 'monthly'`
  await sql`ALTER TABLE manual_transactions ADD COLUMN IF NOT EXISTS recurring_start_month TEXT`
  await sql`ALTER TABLE cc_transactions ADD COLUMN IF NOT EXISTS chug_id TEXT`
  for (const cat of DEFAULT_CATEGORIES) {
    await sql`
      INSERT INTO budget_categories (id, name, budget_amount, sort_order)
      VALUES (${cat.id}, ${cat.name}, ${cat.budget_amount}, ${cat.sort_order})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order
    `
  }
}

export async function initAviadDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS aviad_customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT ''
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS aviad_class_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS aviad_jobs (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      first_hour_rate NUMERIC NOT NULL DEFAULT 250,
      additional_hour_rate NUMERIC NOT NULL DEFAULT 150,
      created_at TEXT NOT NULL DEFAULT ''
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS aviad_job_events (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS aviad_classes (
      id TEXT PRIMARY KEY,
      class_type_id TEXT NOT NULL,
      duration_hours NUMERIC NOT NULL DEFAULT 1.5,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT ''
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS aviad_invoices (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      total_minutes INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      paid_at TEXT,
      payment_method TEXT
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS aviad_assignments (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL DEFAULT '',
      class_type_id TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      due_at TEXT NOT NULL,
      reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TEXT NOT NULL DEFAULT ''
    )
  `
  await sql`ALTER TABLE aviad_assignments ADD COLUMN IF NOT EXISTS class_type_id TEXT NOT NULL DEFAULT ''`
  await sql`ALTER TABLE aviad_assignments ALTER COLUMN class_id SET DEFAULT ''`
  await sql`ALTER TABLE aviad_assignments ADD COLUMN IF NOT EXISTS completed_at TEXT`
  await sql`
    CREATE TABLE IF NOT EXISTS aviad_push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      subscription TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT ''
    )
  `
  await sql`ALTER TABLE aviad_jobs ADD COLUMN IF NOT EXISTS completed_at TEXT`
  await sql`ALTER TABLE aviad_job_events ADD COLUMN IF NOT EXISTS series_id TEXT`
  await sql`ALTER TABLE aviad_classes ADD COLUMN IF NOT EXISTS series_id TEXT`
  await sql`ALTER TABLE aviad_job_events ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE`
  await sql`ALTER TABLE aviad_job_events ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE`
  await sql`ALTER TABLE aviad_classes ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE`
  await sql`ALTER TABLE aviad_classes ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE`
  await sql`ALTER TABLE aviad_job_events ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT ''`
}

export async function initZyDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS zy_essays (
      id TEXT PRIMARY KEY,
      parsha_slug TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      body_html TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      emailed_at TIMESTAMPTZ
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS zy_subscribers (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  // Edits to essays from the markdown archive (content/zichronyonatan),
  // which can't be written at runtime. NULL columns mean "use the original".
  await sql`
    CREATE TABLE IF NOT EXISTS zy_archive_overrides (
      id TEXT PRIMARY KEY,
      parsha_slug TEXT,
      title TEXT,
      author TEXT,
      body_html TEXT,
      hidden BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS zy_email_log (
      id TEXT PRIMARY KEY,
      essay_id TEXT NOT NULL DEFAULT '',
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      recipients INTEGER NOT NULL DEFAULT 0,
      failures INTEGER NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT ''
    )
  `
  // kind: 'scheduled' | 'manual' | 'test' | 'skipped' | 'cancelled'.
  // send_date is the Israel-time Friday a scheduled run was for, which also
  // keeps the two weekly cron runs (DST) from both sending.
  await sql`ALTER TABLE zy_email_log ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT ''`
  await sql`ALTER TABLE zy_email_log ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT ''`
  await sql`ALTER TABLE zy_email_log ADD COLUMN IF NOT EXISTS send_date TEXT`
  await sql`ALTER TABLE zy_email_log ADD COLUMN IF NOT EXISTS failed_list TEXT NOT NULL DEFAULT ''`
  // Public sign-ups waiting for the person to click the confirmation link.
  await sql`
    CREATE TABLE IF NOT EXISTS zy_pending_subscribers (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  // Fridays (Israel date, YYYY-MM-DD) whose scheduled email was cancelled.
  await sql`
    CREATE TABLE IF NOT EXISTS zy_schedule_skips (
      send_date TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

export default sql
