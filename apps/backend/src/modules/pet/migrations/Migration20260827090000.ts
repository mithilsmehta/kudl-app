import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260827090000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "pet" (` +
        `"id" text not null, ` +
        `"customer_id" text not null, ` +
        `"name" text not null, ` +
        `"type" text check ("type" in ('dog', 'cat', 'bird', 'small_pet', 'reptile', 'other')) not null, ` +
        `"gender" text check ("gender" in ('male', 'female')) not null, ` +
        `"avatar_url" text null, ` +
        `"breed" text null, ` +
        `"birthday" timestamptz null, ` +
        `"life_stage" text check ("life_stage" in ('baby', 'young', 'adult', 'senior')) null, ` +
        `"approx_age" text check ("approx_age" in ('under_six_months', 'six_to_twelve_months', 'one_to_two_years', 'three_to_five_years', 'five_to_seven_years', 'over_seven_years')) null, ` +
        `"size" text check ("size" in ('toy', 'small', 'medium', 'large')) null, ` +
        `"allergies" jsonb null, ` +
        `"spayed_neutered" boolean null, ` +
        `"personality" jsonb null, ` +
        `"created_at" timestamptz not null default now(), ` +
        `"updated_at" timestamptz not null default now(), ` +
        `"deleted_at" timestamptz null, ` +
        `constraint "pet_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pet_customer_id_created_at" ON "pet" ("customer_id", "created_at");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pet_deleted_at" ON "pet" ("deleted_at");`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "pet" cascade;`)
  }
}
