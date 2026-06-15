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
}

export default sql
