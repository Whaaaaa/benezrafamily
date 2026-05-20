import sql, { initDb } from '@/lib/db'

// Shavuot 2026: June 1 (erev/dinner), June 2 (day + lunch BBQ)
// Shabbos: June 5 (night), June 6 (lunch)
const SEED_EVENTS = [
  { id: 'seed-evt-1', date: '2026-06-01', title: 'Shavuot Dinner — us + Avi', color: 'indigo' },
  { id: 'seed-evt-2', date: '2026-06-02', title: 'Shavuot Day Kiddush', color: 'cyan' },
  { id: 'seed-evt-3', date: '2026-06-02', title: 'Shavuot Lunch BBQ — Nosson', color: 'lime' },
  { id: 'seed-evt-4', date: '2026-06-05', title: 'Shabbos Dinner — just us', color: 'fuchsia' },
  { id: 'seed-evt-5', date: '2026-06-06', title: 'Shabbos Lunch — Erin + Kids', color: 'orange' },
]

const SEED_MEALS = [
  // Shavuot Dinner — June 1
  { id: 'seed-meal-01', date: '2026-06-01', name: 'Cheesy Pasta' },
  { id: 'seed-meal-02', date: '2026-06-01', name: 'Salmon' },
  { id: 'seed-meal-03', date: '2026-06-01', name: 'Caesar Salad' },
  // Shavuot Day Kiddush — June 2
  { id: 'seed-meal-04', date: '2026-06-02', name: 'Dairy Kiddush' },
  { id: 'seed-meal-05', date: '2026-06-02', name: 'Coffee Bar' },
  { id: 'seed-meal-06', date: '2026-06-02', name: 'Cinnamon Rolls' },
  { id: 'seed-meal-07', date: '2026-06-02', name: 'Cheesecake' },
  { id: 'seed-meal-08', date: '2026-06-02', name: 'Cheese and Crackers' },
  { id: 'seed-meal-09', date: '2026-06-02', name: 'Olives' },
  { id: 'seed-meal-10', date: '2026-06-02', name: 'Herring' },
  { id: 'seed-meal-11', date: '2026-06-02', name: 'Pickles' },
  // Shavuot Lunch BBQ — June 2
  { id: 'seed-meal-12', date: '2026-06-02', name: 'Hot Dogs' },
  { id: 'seed-meal-13', date: '2026-06-02', name: 'Arayos' },
  { id: 'seed-meal-14', date: '2026-06-02', name: 'Rice' },
  { id: 'seed-meal-15', date: '2026-06-02', name: 'Salad' },
  // Shabbos Dinner — June 5
  { id: 'seed-meal-16', date: '2026-06-05', name: 'Pot Pie' },
  { id: 'seed-meal-17', date: '2026-06-05', name: 'Fancy Veggie' },
  { id: 'seed-meal-18', date: '2026-06-05', name: 'Dips' },
  // Shabbos Lunch — June 6
  { id: 'seed-meal-19', date: '2026-06-06', name: 'Tacos' },
  { id: 'seed-meal-20', date: '2026-06-06', name: 'Slow Cook Meat' },
  { id: 'seed-meal-21', date: '2026-06-06', name: 'Orange Juice' },
  { id: 'seed-meal-22', date: '2026-06-06', name: 'Rice and Beans' },
  { id: 'seed-meal-23', date: '2026-06-06', name: 'Salsa' },
  { id: 'seed-meal-24', date: '2026-06-06', name: 'Guac' },
  { id: 'seed-meal-25', date: '2026-06-06', name: 'Cilantro' },
  { id: 'seed-meal-26', date: '2026-06-06', name: 'Spicy Peppers' },
  { id: 'seed-meal-27', date: '2026-06-06', name: 'Pareve Dessert (Erin)' },
  { id: 'seed-meal-28', date: '2026-06-06', name: 'Little Challahs' },
  { id: 'seed-meal-29', date: '2026-06-06', name: 'Pistachios' },
  { id: 'seed-meal-30', date: '2026-06-06', name: 'Bamba and Chocolate Chips' },
  { id: 'seed-meal-31', date: '2026-06-06', name: 'Fruits and Veggies' },
]

export async function POST() {
  await initDb()

  for (const evt of SEED_EVENTS) {
    await sql`
      INSERT INTO calendar_events (id, date, title, color)
      VALUES (${evt.id}, ${evt.date}, ${evt.title}, ${evt.color})
      ON CONFLICT (id) DO NOTHING
    `
  }

  for (const meal of SEED_MEALS) {
    await sql`
      INSERT INTO meals (id, date, name, template_id)
      VALUES (${meal.id}, ${meal.date}, ${meal.name}, '')
      ON CONFLICT (id) DO NOTHING
    `
  }

  return Response.json({ ok: true, events: SEED_EVENTS.length, meals: SEED_MEALS.length })
}
