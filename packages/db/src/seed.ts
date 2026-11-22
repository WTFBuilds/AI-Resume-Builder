import { TEMPLATES } from "@airesume/templates";
import { db } from "./client";
import { template } from "./schema";

/** Upsert the launch template registry into the templates table. */
async function main() {
  const rows = Object.values(TEMPLATES).map((tpl, i) => ({
    id: tpl.slug,
    name: tpl.name,
    category: tpl.category,
    description: tpl.description,
    isPremium: false,
    sortOrder: i,
    active: true,
  }));

  for (const row of rows) {
    await db
      .insert(template)
      .values(row)
      .onConflictDoUpdate({
        target: template.id,
        set: {
          name: row.name,
          category: row.category,
          description: row.description,
          sortOrder: row.sortOrder,
          active: true,
        },
      });
  }
  console.log(`Seeded ${rows.length} templates: ${rows.map((r) => r.id).join(", ")}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
