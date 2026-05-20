import sql, { initDb } from '@/lib/db'

// Shavuot starts Thu night May 21 → Fri May 22 day → Shabbos Sat May 23
//
// Structure:
//   Section headings → calendar EVENTS (occasions)
//   Dishes you cook  → calendar MEALS with ingredient templates
//   Items listed under a dish → ingredients of that dish
//   Single-buy items → grouped into a "Shabbos Lunch Extras" wrapper meal
//   Nosson/Erin bring items, "go through dips" → skipped (not shopping)

const SEED_TEMPLATES = [
  // ── Shavuot Dinner (Thu May 21) ──────────────────────────────
  {
    id: 'tmpl-cheesy-pasta',
    name: 'Cheesy Pasta',
    ingredients: [
      { id: 'ing-cp-1', name: 'Pasta',         quantity: '' },
      { id: 'ing-cp-2', name: 'Mozzarella',    quantity: '' },
      { id: 'ing-cp-3', name: 'Butter',        quantity: '' },
      { id: 'ing-cp-4', name: 'Garlic',        quantity: '' },
      { id: 'ing-cp-5', name: 'Heavy Cream',   quantity: '' },
      { id: 'ing-cp-6', name: 'Parmesan',      quantity: '' },
      { id: 'ing-cp-7', name: 'Salt',          quantity: '' },
      { id: 'ing-cp-8', name: 'Pepper',        quantity: '' },
    ],
  },
  {
    id: 'tmpl-salmon',
    name: 'Salmon',
    ingredients: [
      { id: 'ing-sal-1', name: 'Salmon Fillets', quantity: '' },
      { id: 'ing-sal-2', name: 'Lemon',          quantity: '' },
      { id: 'ing-sal-3', name: 'Olive Oil',      quantity: '' },
      { id: 'ing-sal-4', name: 'Dill',           quantity: '' },
      { id: 'ing-sal-5', name: 'Capers',         quantity: '' },
      { id: 'ing-sal-6', name: 'Salt',           quantity: '' },
      { id: 'ing-sal-7', name: 'Pepper',         quantity: '' },
    ],
  },
  {
    id: 'tmpl-caesar-salad',
    name: 'Caesar Salad',
    ingredients: [
      { id: 'ing-cs-1', name: 'Romaine Lettuce', quantity: '' },
      { id: 'ing-cs-2', name: 'Parmesan',        quantity: '' },
      { id: 'ing-cs-3', name: 'Caesar Dressing', quantity: '' },
      { id: 'ing-cs-4', name: 'Croutons',        quantity: '' },
      { id: 'ing-cs-5', name: 'Lemon',           quantity: '' },
      { id: 'ing-cs-6', name: 'Anchovy Paste',   quantity: '' },
    ],
  },
  // ── Shavuot Day Kiddush (Fri May 22 morning) ─────────────────
  // All items listed under "Shavuot Day" are kiddush spread ingredients
  {
    id: 'tmpl-dairy-kiddush',
    name: 'Dairy Kiddush',
    ingredients: [
      { id: 'ing-dk-1',  name: 'Grape Juice',     quantity: '' },
      { id: 'ing-dk-2',  name: 'Coffee',          quantity: '' },
      { id: 'ing-dk-3',  name: 'Milk',            quantity: '' },
      { id: 'ing-dk-4',  name: 'Creamer',         quantity: '' },
      { id: 'ing-dk-5',  name: 'Sugar',           quantity: '' },
      { id: 'ing-dk-6',  name: 'Cinnamon Rolls',  quantity: '' },
      { id: 'ing-dk-7',  name: 'Cheesecake',      quantity: '' },
      { id: 'ing-dk-8',  name: 'Cheese',          quantity: '' },
      { id: 'ing-dk-9',  name: 'Crackers',        quantity: '' },
      { id: 'ing-dk-10', name: 'Olives',          quantity: '' },
      { id: 'ing-dk-11', name: 'Herring',         quantity: '' },
      { id: 'ing-dk-12', name: 'Pickles',         quantity: '' },
    ],
  },
  // ── Shavuot Lunch BBQ – Nosson (Fri May 22 afternoon) ────────
  {
    id: 'tmpl-hot-dogs',
    name: 'Hot Dogs',
    ingredients: [
      { id: 'ing-hd-1', name: 'Hot Dogs',     quantity: '' },
      { id: 'ing-hd-2', name: 'Hot Dog Buns', quantity: '' },
      { id: 'ing-hd-3', name: 'Ketchup',      quantity: '' },
      { id: 'ing-hd-4', name: 'Mustard',      quantity: '' },
    ],
  },
  {
    id: 'tmpl-arayos',
    name: 'Arayos',
    ingredients: [
      { id: 'ing-ar-1', name: 'Ground Beef',  quantity: '' },
      { id: 'ing-ar-2', name: 'Onion',        quantity: '' },
      { id: 'ing-ar-3', name: 'Garlic',       quantity: '' },
      { id: 'ing-ar-4', name: 'Spices',       quantity: '' },
      { id: 'ing-ar-5', name: 'Skewers',      quantity: '' },
    ],
  },
  {
    id: 'tmpl-rice',
    name: 'Rice',
    ingredients: [
      { id: 'ing-ri-1', name: 'Rice',  quantity: '' },
      { id: 'ing-ri-2', name: 'Water', quantity: '' },
      { id: 'ing-ri-3', name: 'Oil',   quantity: '' },
      { id: 'ing-ri-4', name: 'Salt',  quantity: '' },
    ],
  },
  // ── Shabbos Dinner – just us (Fri May 22 night) ───────────────
  {
    id: 'tmpl-pot-pie',
    name: 'Pot Pie',
    ingredients: [
      { id: 'ing-pp-1', name: 'Pie Crust',         quantity: '' },
      { id: 'ing-pp-2', name: 'Chicken',           quantity: '' },
      { id: 'ing-pp-3', name: 'Mixed Vegetables',  quantity: '' },
      { id: 'ing-pp-4', name: 'Chicken Broth',     quantity: '' },
      { id: 'ing-pp-5', name: 'Heavy Cream',       quantity: '' },
      { id: 'ing-pp-6', name: 'Onion',             quantity: '' },
      { id: 'ing-pp-7', name: 'Garlic',            quantity: '' },
      { id: 'ing-pp-8', name: 'Butter',            quantity: '' },
      { id: 'ing-pp-9', name: 'Flour',             quantity: '' },
    ],
  },
  {
    id: 'tmpl-salad',
    name: 'Salad',
    ingredients: [
      { id: 'ing-sa-1', name: 'Mixed Greens',    quantity: '' },
      { id: 'ing-sa-2', name: 'Cherry Tomatoes', quantity: '' },
      { id: 'ing-sa-3', name: 'Cucumber',        quantity: '' },
      { id: 'ing-sa-4', name: 'Red Onion',       quantity: '' },
      { id: 'ing-sa-5', name: 'Dressing',        quantity: '' },
    ],
  },
  // ── Shabbos Lunch – Erin + Kids (Sat May 23) ─────────────────
  // Slow Cook Meat, Salsa, Guac, Cilantro, Spicy Peppers → taco ingredients
  // Tortillas and Cheese are standard missing taco ingredients
  {
    id: 'tmpl-tacos',
    name: 'Tacos',
    ingredients: [
      { id: 'ing-ta-1', name: 'Slow Cook Meat',  quantity: '' },
      { id: 'ing-ta-2', name: 'Tortillas',       quantity: '' },
      { id: 'ing-ta-3', name: 'Salsa',           quantity: '' },
      { id: 'ing-ta-4', name: 'Guac',            quantity: '' },
      { id: 'ing-ta-5', name: 'Cilantro',        quantity: '' },
      { id: 'ing-ta-6', name: 'Spicy Peppers',   quantity: '' },
      { id: 'ing-ta-7', name: 'Shredded Cheese', quantity: '' },
      { id: 'ing-ta-8', name: 'Sour Cream',      quantity: '' },
      { id: 'ing-ta-9', name: 'Lime',            quantity: '' },
    ],
  },
  {
    id: 'tmpl-rice-and-beans',
    name: 'Rice and Beans',
    ingredients: [
      { id: 'ing-rb-1', name: 'Rice',        quantity: '' },
      { id: 'ing-rb-2', name: 'Black Beans', quantity: '' },
      { id: 'ing-rb-3', name: 'Onion',       quantity: '' },
      { id: 'ing-rb-4', name: 'Garlic',      quantity: '' },
      { id: 'ing-rb-5', name: 'Olive Oil',   quantity: '' },
      { id: 'ing-rb-6', name: 'Cumin',       quantity: '' },
      { id: 'ing-rb-7', name: 'Salt',        quantity: '' },
    ],
  },
  // Buy-and-serve items for Shabbos Lunch grouped under one wrapper meal
  // (Pareve Dessert skipped — Erin brings it)
  {
    id: 'tmpl-shabbos-lunch-extras',
    name: 'Shabbos Lunch Extras',
    ingredients: [
      { id: 'ing-se-1', name: 'Orange Juice',                quantity: '' },
      { id: 'ing-se-2', name: 'Little Challahs',             quantity: '' },
      { id: 'ing-se-3', name: 'Pistachios',                  quantity: '' },
      { id: 'ing-se-4', name: 'Bamba and Chocolate Chips',   quantity: '' },
      { id: 'ing-se-5', name: 'Fruits and Veggies',          quantity: '' },
    ],
  },
]

const SEED_EVENTS = [
  { id: 'seed-evt-1', date: '2026-05-21', title: 'Shavuot Dinner — us + Avi',   color: 'indigo'  },
  { id: 'seed-evt-2', date: '2026-05-22', title: 'Shavuot Day Kiddush',          color: 'cyan'    },
  { id: 'seed-evt-3', date: '2026-05-22', title: 'Shavuot Lunch BBQ — Nosson',  color: 'lime'    },
  { id: 'seed-evt-4', date: '2026-05-22', title: 'Shabbos Dinner — just us',    color: 'fuchsia' },
  { id: 'seed-evt-5', date: '2026-05-23', title: 'Shabbos Lunch — Erin + Kids', color: 'orange'  },
]

const SEED_MEALS = [
  // Thu May 21 — Shavuot Dinner
  { id: 'seed-meal-01', date: '2026-05-21', name: 'Cheesy Pasta',          templateId: 'tmpl-cheesy-pasta'        },
  { id: 'seed-meal-02', date: '2026-05-21', name: 'Salmon',                templateId: 'tmpl-salmon'              },
  { id: 'seed-meal-03', date: '2026-05-21', name: 'Caesar Salad',          templateId: 'tmpl-caesar-salad'        },
  // Fri May 22 — Shavuot Day Kiddush (morning)
  { id: 'seed-meal-04', date: '2026-05-22', name: 'Dairy Kiddush',         templateId: 'tmpl-dairy-kiddush'       },
  // Fri May 22 — Shavuot Lunch BBQ (afternoon); Nosson brings salad — not our shopping
  { id: 'seed-meal-05', date: '2026-05-22', name: 'Hot Dogs',              templateId: 'tmpl-hot-dogs'            },
  { id: 'seed-meal-06', date: '2026-05-22', name: 'Arayos',                templateId: 'tmpl-arayos'              },
  { id: 'seed-meal-07', date: '2026-05-22', name: 'Rice',                  templateId: 'tmpl-rice'                },
  // Fri May 22 — Shabbos Dinner (night); "Dips — go through" = use existing, no shopping
  { id: 'seed-meal-08', date: '2026-05-22', name: 'Pot Pie',               templateId: 'tmpl-pot-pie'             },
  { id: 'seed-meal-09', date: '2026-05-22', name: 'Fancy Veggie',          templateId: ''                         },
  { id: 'seed-meal-10', date: '2026-05-22', name: 'Salad',                 templateId: 'tmpl-salad'               },
  // Sat May 23 — Shabbos Lunch; Pareve Dessert skipped (Erin brings)
  { id: 'seed-meal-11', date: '2026-05-23', name: 'Tacos',                 templateId: 'tmpl-tacos'               },
  { id: 'seed-meal-12', date: '2026-05-23', name: 'Rice and Beans',        templateId: 'tmpl-rice-and-beans'      },
  { id: 'seed-meal-13', date: '2026-05-23', name: 'Shabbos Lunch Extras',  templateId: 'tmpl-shabbos-lunch-extras'},
]

export async function POST() {
  await initDb()

  // Remove old seed data before re-seeding (allows re-running idempotently)
  await sql`DELETE FROM calendar_events WHERE id LIKE 'seed-evt-%'`
  await sql`DELETE FROM meal_template_ingredients WHERE template_id LIKE 'tmpl-%'`
  await sql`DELETE FROM meal_templates WHERE id LIKE 'tmpl-%'`
  await sql`DELETE FROM meals WHERE id LIKE 'seed-meal-%'`

  for (const tmpl of SEED_TEMPLATES) {
    await sql`
      INSERT INTO meal_templates (id, name)
      VALUES (${tmpl.id}, ${tmpl.name})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `
    for (const ing of tmpl.ingredients) {
      await sql`
        INSERT INTO meal_template_ingredients (id, template_id, name, quantity)
        VALUES (${ing.id}, ${tmpl.id}, ${ing.name}, ${ing.quantity})
      `
    }
  }

  for (const evt of SEED_EVENTS) {
    await sql`
      INSERT INTO calendar_events (id, date, title, color)
      VALUES (${evt.id}, ${evt.date}, ${evt.title}, ${evt.color})
    `
  }

  for (const meal of SEED_MEALS) {
    await sql`
      INSERT INTO meals (id, date, name, template_id)
      VALUES (${meal.id}, ${meal.date}, ${meal.name}, ${meal.templateId})
    `
  }

  return Response.json({ ok: true, templates: SEED_TEMPLATES.length, events: SEED_EVENTS.length, meals: SEED_MEALS.length })
}
