"use server"

import { queryDb } from "@/lib/db"

export async function ensureMembershipTablesExist() {
  try {
    // Check if required tables exist
    const tablesCheck = await queryDb(`
      SELECT 
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_memberships') as um_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'membership_plans') as mp_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_bargaining_settings') as pbs_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'billing_events') as be_exists
    `)

    const tableExists = tablesCheck[0]

    // Create missing tables if needed
    if (!tableExists.um_exists) {
      console.log("Creating user_memberships table...")
      await queryDb(`
        CREATE TABLE user_memberships (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          plan_id INTEGER NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          shopify_charge_id VARCHAR(255),
          start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          end_date TIMESTAMP WITH TIME ZONE,
          next_billing_date TIMESTAMP WITH TIME ZONE,
          trial_end_date TIMESTAMP WITH TIME ZONE,
          billing_status VARCHAR(50),
          billing_details JSONB,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `)
    }

    if (!tableExists.mp_exists) {
      console.log("Creating membership_plans table...")
      await queryDb(`
        CREATE TABLE membership_plans (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          slug VARCHAR(50) NOT NULL UNIQUE,
          description TEXT,
          price DECIMAL(10, 2) NOT NULL,
          max_products INTEGER NOT NULL DEFAULT 10,
          monthly_requests INTEGER NOT NULL DEFAULT 100,
          features JSONB,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `)

      // Insert default plans
      await queryDb(`
        INSERT INTO membership_plans (name, slug, description, price, max_products, monthly_requests, features)
        VALUES 
          ('Free Plan', 'free', 'Basic plan with limited features', 0, 10, 100, '["View all Shopify inventory", "Add up to 10 products for bargaining", "Free installation guide", "Basic analytics", "Chat support"]'),
          ('Startup Plan', 'startup', 'Perfect for growing businesses', 29, 50, 1000, '["View all Shopify inventory", "Add up to 50 products for bargaining", "Free installation guide", "Advanced analytics", "Priority support", "Custom bargaining rules"]'),
          ('Business Plan', 'business', 'For established businesses', 99, 0, 10000, '["View all Shopify inventory", "Unlimited products for bargaining", "Free installation guide", "Premium analytics", "24/7 support", "Custom bargaining rules", "API access", "White-label option"]')
      `)
    }

    if (!tableExists.pbs_exists) {
      console.log("Creating product_bargaining_settings table...")
      await queryDb(`
        CREATE TABLE product_bargaining_settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          product_id VARCHAR(255) NOT NULL,
          variant_id VARCHAR(255) NOT NULL,
          bargaining_enabled BOOLEAN NOT NULL DEFAULT false,
          min_price DECIMAL(10, 2) NOT NULL,
          behavior VARCHAR(50) NOT NULL DEFAULT 'normal',
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, product_id, variant_id)
        )
      `)
    }

    if (!tableExists.be_exists) {
      console.log("Creating billing_events table...")
      await queryDb(`
        CREATE TABLE billing_events (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          event_type VARCHAR(50) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          description TEXT,
          status VARCHAR(50) NOT NULL,
          shopify_charge_id VARCHAR(255),
          event_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `)
    }

    // Check for missing columns and add them if needed
    const userMembershipsColumnsCheck = await queryDb(`
      SELECT 
        EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_memberships' AND column_name = 'billing_status') as billing_status_exists,
        EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_memberships' AND column_name = 'billing_details') as billing_details_exists,
        EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_memberships' AND column_name = 'next_billing_date') as next_billing_date_exists,
        EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_memberships' AND column_name = 'trial_end_date') as trial_end_date_exists
    `)

    const columnsExist = userMembershipsColumnsCheck[0]

    if (!columnsExist.billing_status_exists) {
      console.log("Adding billing_status column to user_memberships...")
      await queryDb(`ALTER TABLE user_memberships ADD COLUMN billing_status VARCHAR(50)`)
    }

    if (!columnsExist.billing_details_exists) {
      console.log("Adding billing_details column to user_memberships...")
      await queryDb(`ALTER TABLE user_memberships ADD COLUMN billing_details JSONB`)
    }

    if (!columnsExist.next_billing_date_exists) {
      console.log("Adding next_billing_date column to user_memberships...")
      await queryDb(`ALTER TABLE user_memberships ADD COLUMN next_billing_date TIMESTAMP WITH TIME ZONE`)
    }

    if (!columnsExist.trial_end_date_exists) {
      console.log("Adding trial_end_date column to user_memberships...")
      await queryDb(`ALTER TABLE user_memberships ADD COLUMN trial_end_date TIMESTAMP WITH TIME ZONE`)
    }

    return { success: true, message: "Database schema verified and updated if needed" }
  } catch (error) {
    console.error("Error ensuring membership tables exist:", error)
    return { success: false, error: String(error) }
  }
}
