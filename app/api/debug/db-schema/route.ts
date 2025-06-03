import { NextResponse } from "next/server"
import { queryDb, testConnection } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// Define the required tables for Shopify integration
const requiredTables = [
  "shopify_stores",
  "shopify_auth_tokens",
  "shopify_nonce_tokens",
  "shopify_uninstall_events",
  "widget_settings",
]

// Define the expected schema for each table
const tableSchemas = {
  shopify_stores: [
    "id",
    "user_id",
    "shop_domain",
    "shop_name",
    "email",
    "country",
    "currency",
    "timezone",
    "owner_name",
    "plan_name",
    "status",
    "created_at",
    "updated_at",
    "last_status_check",
  ],
  shopify_auth_tokens: ["id", "store_id", "access_token", "scope", "created_at", "updated_at"],
  shopify_nonce_tokens: ["id", "nonce", "expires_at"],
  widget_settings: [
    "id",
    "shop",
    "label",
    "bg_color",
    "text_color",
    "font_size",
    "border_radius",
    "position",
    "updated_at",
  ],
}

export async function GET(request: Request) {
  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Test database connection
    const connectionTest = await testConnection()
    if (!connectionTest.connected) {
      return NextResponse.json(
        {
          success: false,
          connection: connectionTest,
          message: "Database connection failed",
        },
        { status: 500 },
      )
    }

    // Check if tables exist
    const tableResults = {}
    const missingTables = []
    const schemaIssues = {}

    for (const table of requiredTables) {
      try {
        // Check if table exists
        const tableCheck = await queryDb(
          `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `,
          [table],
        )

        const tableExists = tableCheck[0]?.exists === true
        tableResults[table] = tableExists ? "✅ Exists" : "❌ Missing"

        if (!tableExists) {
          missingTables.push(table)
          continue
        }

        // Check table schema if we have expected columns defined
        if (tableSchemas[table]) {
          const columnCheck = await queryDb(
            `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1
          `,
            [table],
          )

          const existingColumns = columnCheck.map((col) => col.column_name)
          const missingColumns = tableSchemas[table].filter((col) => !existingColumns.includes(col))

          if (missingColumns.length > 0) {
            schemaIssues[table] = {
              missingColumns,
              existingColumns,
            }
          }
        }
      } catch (error) {
        console.error(`Error checking table ${table}:`, error)
        tableResults[table] = `❌ Error: ${error.message}`
      }
    }

    // Generate SQL to create missing tables
    let fixSql = ""

    if (missingTables.includes("shopify_stores")) {
      fixSql += `
CREATE TABLE shopify_stores (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  shop_domain VARCHAR(255) NOT NULL,
  shop_name VARCHAR(255),
  email VARCHAR(255),
  country VARCHAR(50),
  currency VARCHAR(10),
  timezone VARCHAR(100),
  owner_name VARCHAR(255),
  plan_name VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_status_check TIMESTAMP
);
CREATE INDEX idx_shopify_stores_user_id ON shopify_stores(user_id);
CREATE UNIQUE INDEX idx_shopify_stores_shop_domain ON shopify_stores(shop_domain);
      `
    }

    if (missingTables.includes("shopify_auth_tokens")) {
      fixSql += `
CREATE TABLE shopify_auth_tokens (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL,
  access_token TEXT NOT NULL,
  scope TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_store FOREIGN KEY(store_id) REFERENCES shopify_stores(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_shopify_auth_tokens_store_id ON shopify_auth_tokens(store_id);
      `
    }

    if (missingTables.includes("shopify_nonce_tokens")) {
      fixSql += `
CREATE TABLE shopify_nonce_tokens (
  id SERIAL PRIMARY KEY,
  nonce VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_shopify_nonce_tokens_nonce ON shopify_nonce_tokens(nonce);
CREATE INDEX idx_shopify_nonce_tokens_expires_at ON shopify_nonce_tokens(expires_at);
      `
    }

    if (missingTables.includes("shopify_uninstall_events")) {
      fixSql += `
CREATE TABLE shopify_uninstall_events (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_shopify_uninstall_events_store_id ON shopify_uninstall_events(store_id);
      `
    }

    if (missingTables.includes("widget_settings")) {
      fixSql += `
CREATE TABLE widget_settings (
  id SERIAL PRIMARY KEY,
  shop VARCHAR(255) NOT NULL,
  label VARCHAR(100) NOT NULL DEFAULT 'Bargain a Deal',
  bg_color VARCHAR(20) NOT NULL DEFAULT '#2E66F8',
  text_color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
  font_size VARCHAR(10) NOT NULL DEFAULT '16px',
  border_radius VARCHAR(10) NOT NULL DEFAULT '8px',
  position VARCHAR(20) NOT NULL DEFAULT 'bottom_right',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_widget_settings_shop ON widget_settings(shop);
      `
    }

    return NextResponse.json({
      success: true,
      connection: connectionTest,
      tables: tableResults,
      missingTables,
      schemaIssues: Object.keys(schemaIssues).length > 0 ? schemaIssues : null,
      fixSql: missingTables.length > 0 ? fixSql : null,
    })
  } catch (error) {
    console.error("Error checking database schema:", error)
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 },
    )
  }
}
