import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260825120000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "recommendation_event" ("id" text not null, "customer_id" text null, "session_id" text null, "product_id" text null, "event_type" text check ("event_type" in ('product_viewed', 'product_added_to_cart', 'product_purchased', 'search_performed')) not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "recommendation_event_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_recommendation_event_customer_id_created_at" ON "recommendation_event" ("customer_id", "created_at");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_recommendation_event_session_id_created_at" ON "recommendation_event" ("session_id", "created_at");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_recommendation_event_product_id_event_type" ON "recommendation_event" ("product_id", "event_type");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_recommendation_event_event_type_created_at" ON "recommendation_event" ("event_type", "created_at");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_recommendation_event_deleted_at" ON "recommendation_event" ("deleted_at");`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "recommendation_event" cascade;`)
  }
}
