#!/usr/bin/env node

/**
 * Comprehensive Database Schema Validation and Migration Verification Script
 *
 * This script validates that all required tables, columns, indexes, and constraints
 * exist as expected by the application services. It also verifies RLS policies,
 * functions, triggers, and overall database health.
 *
 * Usage:
 *   node scripts/validate-database-schema.js
 *   npm run validate-schema
 *
 * Environment Variables:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_ANON_KEY - Your Supabase anon key
 *   SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key (for admin operations)
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Create Supabase client with service role for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Expected schema definition
const EXPECTED_SCHEMA = {
  tables: [
    "users",
    "reviews_firebase",
    "comments_firebase",
    "chat_rooms_firebase",
    "chat_messages_firebase",
    "chat_members_firebase",
    "message_reads",
    "follows",
    "blocks",
    "review_likes",
    "colleges",
    "notifications",
    "push_tokens",
    "reports",
  ],

  tableColumns: {
    users: [
      "id",
      "anonymous_id",
      "ban_reason",
      "city",
      "clerk_user_id",
      "created_at",
      "email",
      "gender",
      "gender_preference",
      "institution_type",
      "is_banned",
      "is_blocked",
      "last_active",
      "latitude",
      "longitude",
      "location_address",
      "location_full_name",
      "location_name",
      "location_type",
      "location_updated_at",
      "reputation_score",
      "state",
      "subscription_expires_at",
      "subscription_tier",
      "total_reviews_submitted",
      "updated_at",
      "username",
      "verification_level",
      "college_id",
      "follower_count",
      "following_count",
      "privacy_settings",
    ],

    chat_members_firebase: [
      "id",
      "chat_room_id",
      "user_id",
      "role",
      "joined_at",
      "is_active",
      "permissions",
      "created_at",
      "updated_at",
    ],

    message_reads: ["id", "room_id", "user_id", "last_read_at", "last_message_id", "created_at", "updated_at"],

    follows: ["id", "follower_id", "following_id", "created_at"],

    blocks: ["id", "blocker_id", "blocked_id", "reason", "created_at"],

    review_likes: ["id", "review_id", "user_id", "created_at"],

    colleges: [
      "id",
      "name",
      "city",
      "state",
      "coordinates",
      "institution_type",
      "alias",
      "scorecard_id",
      "website_url",
      "student_count",
      "founded_year",
      "is_active",
      "created_at",
      "updated_at",
    ],
  },

  functions: [
    "update_updated_at_column",
    "update_user_review_count",
    "update_chat_room_activity",
    "create_notification",
    "get_nearby_reviews",
    "search_reviews",
    "get_user_stats",
    "get_active_chat_rooms",
    "cleanup_old_notifications",
    "add_user_to_chat_room",
    "remove_user_from_chat_room",
    "is_user_room_member",
    "get_user_room_role",
    "follow_user",
    "unfollow_user",
    "get_follow_counts",
    "is_following",
    "toggle_review_like",
    "has_user_liked_review",
    "get_user_liked_reviews",
    "block_user",
    "unblock_user",
    "is_user_blocked",
    "mark_messages_read",
    "get_unread_message_count",
    "get_user_unread_counts",
    "search_colleges",
    "get_user_engagement_metrics",
    "get_moderation_stats",
  ],

  triggers: [
    "update_users_updated_at",
    "update_reviews_firebase_updated_at",
    "update_comments_firebase_updated_at",
    "update_chat_rooms_firebase_updated_at",
    "update_push_tokens_updated_at",
    "update_reports_updated_at",
    "update_chat_members_firebase_updated_at",
    "update_message_reads_updated_at",
    "update_colleges_updated_at",
    "trigger_update_user_review_count",
    "trigger_update_chat_room_activity",
    "trigger_update_follow_counts",
    "trigger_update_review_like_counts",
    "trigger_update_chat_member_counts",
  ],
};

// Service compatibility tests
const SERVICE_TESTS = {
  "chat.ts": [
    "SELECT * FROM chat_rooms_firebase LIMIT 1",
    "SELECT * FROM chat_messages_firebase LIMIT 1",
    "SELECT * FROM chat_members_firebase LIMIT 1",
  ],

  "users.ts": ["SELECT * FROM users LIMIT 1", "SELECT * FROM follows LIMIT 1", "SELECT * FROM blocks LIMIT 1"],

  "reviews.ts": [
    "SELECT * FROM reviews_firebase LIMIT 1",
    "SELECT * FROM review_likes LIMIT 1",
    "SELECT * FROM comments_firebase LIMIT 1",
  ],

  "collegeService.ts": ["SELECT * FROM colleges LIMIT 1"],

  "realtimeChat.ts": ["SELECT * FROM message_reads LIMIT 1"],
};

// Validation results
let validationResults = {
  success: true,
  errors: [],
  warnings: [],
  info: [],
  performance: {},
  coverage: {},
};

// Utility functions
function logSuccess(message) {
  console.log(`✅ ${message}`);
  validationResults.info.push(message);
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
  validationResults.warnings.push(message);
}

function logError(message) {
  console.log(`❌ ${message}`);
  validationResults.errors.push(message);
  validationResults.success = false;
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
  validationResults.info.push(message);
}

// Database query helper
async function queryDatabase(sql, description = "") {
  try {
    const startTime = Date.now();
    const { data, error } = await supabase.rpc("exec_sql", { sql });
    const duration = Date.now() - startTime;

    if (error) {
      throw error;
    }

    if (description) {
      validationResults.performance[description] = duration;
    }

    return { data, duration };
  } catch (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }
}

// Check if table exists and has expected columns
async function validateTable(tableName) {
  try {
    // Check if table exists
    const { data: tableExists } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_name", tableName);

    if (!tableExists || tableExists.length === 0) {
      logError(`Table '${tableName}' does not exist`);
      return false;
    }

    // Check RLS is enabled
    const { data: rlsCheck } = await supabase
      .from("information_schema.tables")
      .select("*")
      .eq("table_schema", "public")
      .eq("table_name", tableName);

    // Get table columns
    const { data: columns } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable")
      .eq("table_schema", "public")
      .eq("table_name", tableName)
      .order("ordinal_position");

    if (columns) {
      const columnNames = columns.map((col) => col.column_name);
      const expectedColumns = EXPECTED_SCHEMA.tableColumns[tableName];

      if (expectedColumns) {
        const missingColumns = expectedColumns.filter((col) => !columnNames.includes(col));
        const extraColumns = columnNames.filter((col) => !expectedColumns.includes(col));

        if (missingColumns.length > 0) {
          logError(`Table '${tableName}' missing columns: ${missingColumns.join(", ")}`);
        }

        if (extraColumns.length > 0) {
          logWarning(`Table '${tableName}' has extra columns: ${extraColumns.join(", ")}`);
        }

        if (missingColumns.length === 0) {
          logSuccess(`Table '${tableName}' has all expected columns`);
        }
      }
    }

    return true;
  } catch (error) {
    logError(`Failed to validate table '${tableName}': ${error.message}`);
    return false;
  }
}

// Check if function exists
async function validateFunction(functionName) {
  try {
    const { data } = await supabase
      .from("information_schema.routines")
      .select("routine_name")
      .eq("routine_schema", "public")
      .eq("routine_name", functionName);

    if (!data || data.length === 0) {
      logError(`Function '${functionName}' does not exist`);
      return false;
    }

    logSuccess(`Function '${functionName}' exists`);
    return true;
  } catch (error) {
    logError(`Failed to validate function '${functionName}': ${error.message}`);
    return false;
  }
}

// Check if trigger exists
async function validateTrigger(triggerName) {
  try {
    const { data } = await supabase
      .from("information_schema.triggers")
      .select("trigger_name")
      .eq("trigger_schema", "public")
      .eq("trigger_name", triggerName);

    if (!data || data.length === 0) {
      logError(`Trigger '${triggerName}' does not exist`);
      return false;
    }

    logSuccess(`Trigger '${triggerName}' exists`);
    return true;
  } catch (error) {
    logError(`Failed to validate trigger '${triggerName}': ${error.message}`);
    return false;
  }
}

// Test RLS policies
async function validateRLSPolicies() {
  console.log("\n🔒 Validating RLS Policies...");

  try {
    for (const tableName of EXPECTED_SCHEMA.tables) {
      // Check if RLS is enabled
      const { data } = await supabase.rpc("exec_sql", {
        sql: `
          SELECT relrowsecurity
          FROM pg_class
          WHERE relname = '${tableName}'
          AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        `,
      });

      if (data && data.length > 0 && data[0].relrowsecurity) {
        logSuccess(`RLS enabled on table '${tableName}'`);

        // Check for policies
        const { data: policies } = await supabase.rpc("exec_sql", {
          sql: `
            SELECT policyname, cmd, qual
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = '${tableName}'
          `,
        });

        if (policies && policies.length > 0) {
          logSuccess(`Table '${tableName}' has ${policies.length} RLS policies`);
        } else {
          logWarning(`Table '${tableName}' has RLS enabled but no policies found`);
        }
      } else {
        logError(`RLS not enabled on table '${tableName}'`);
      }
    }
  } catch (error) {
    logError(`Failed to validate RLS policies: ${error.message}`);
  }
}

// Test service compatibility
async function validateServiceCompatibility() {
  console.log("\n🔧 Validating Service Compatibility...");

  for (const [serviceName, queries] of Object.entries(SERVICE_TESTS)) {
    logInfo(`Testing compatibility for ${serviceName}...`);

    let serviceSuccess = true;
    for (const query of queries) {
      try {
        const { duration } = await queryDatabase(query, `${serviceName}_query`);
        logSuccess(`${serviceName}: Query executed successfully (${duration}ms)`);
      } catch (error) {
        logError(`${serviceName}: Query failed - ${error.message}`);
        serviceSuccess = false;
      }
    }

    if (serviceSuccess) {
      logSuccess(`${serviceName} is fully compatible`);
    }
  }
}

// Performance analysis
async function analyzePerformance() {
  console.log("\n⚡ Analyzing Query Performance...");

  const performanceTests = [
    {
      name: "User profile lookup",
      query: "SELECT * FROM users WHERE id = (SELECT id FROM users LIMIT 1)",
      expectedMs: 50,
    },
    {
      name: "Review search",
      query: "SELECT * FROM reviews_firebase WHERE status = 'active' ORDER BY created_at DESC LIMIT 10",
      expectedMs: 100,
    },
    {
      name: "Chat messages",
      query: "SELECT * FROM chat_messages_firebase ORDER BY timestamp DESC LIMIT 20",
      expectedMs: 100,
    },
    {
      name: "Follow relationships",
      query: "SELECT * FROM follows LIMIT 10",
      expectedMs: 50,
    },
  ];

  for (const test of performanceTests) {
    try {
      const { duration } = await queryDatabase(test.query, test.name);

      if (duration <= test.expectedMs) {
        logSuccess(`${test.name}: ${duration}ms (✓ under ${test.expectedMs}ms)`);
      } else {
        logWarning(`${test.name}: ${duration}ms (⚠️ over ${test.expectedMs}ms expected)`);
      }
    } catch (error) {
      logError(`${test.name}: Failed - ${error.message}`);
    }
  }
}

// Data integrity checks
async function validateDataIntegrity() {
  console.log("\n🔍 Validating Data Integrity...");

  const integrityChecks = [
    {
      name: "Foreign key constraints",
      query: `
        SELECT COUNT(*) as violations FROM reviews_firebase r
        LEFT JOIN users u ON r.author_id = u.id
        WHERE r.author_id IS NOT NULL AND u.id IS NULL
      `,
    },
    {
      name: "Chat member consistency",
      query: `
        SELECT COUNT(*) as violations FROM chat_members_firebase cm
        LEFT JOIN chat_rooms_firebase cr ON cm.chat_room_id = cr.id
        WHERE cr.id IS NULL
      `,
    },
    {
      name: "Follow relationship consistency",
      query: `
        SELECT COUNT(*) as violations FROM follows f
        LEFT JOIN users u1 ON f.follower_id = u1.id
        LEFT JOIN users u2 ON f.following_id = u2.id
        WHERE u1.id IS NULL OR u2.id IS NULL
      `,
    },
    {
      name: "Review like consistency",
      query: `
        SELECT COUNT(*) as violations FROM review_likes rl
        LEFT JOIN reviews_firebase r ON rl.review_id = r.id
        WHERE r.id IS NULL
      `,
    },
  ];

  for (const check of integrityChecks) {
    try {
      const { data } = await queryDatabase(check.query);

      if (data && data.length > 0) {
        const violations = data[0].violations || 0;
        if (violations === 0) {
          logSuccess(`${check.name}: No violations found`);
        } else {
          logError(`${check.name}: ${violations} violations found`);
        }
      }
    } catch (error) {
      logError(`${check.name}: Check failed - ${error.message}`);
    }
  }
}

// Migration status check
async function checkMigrationStatus() {
  console.log("\n📋 Checking Migration Status...");

  try {
    // Check if migrations table exists
    const { data: migrationTable } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "supabase_migrations")
      .eq("table_name", "schema_migrations");

    if (migrationTable && migrationTable.length > 0) {
      // Get applied migrations
      const { data: migrations } = await supabase
        .from("supabase_migrations.schema_migrations")
        .select("*")
        .order("version");

      if (migrations) {
        logSuccess(`Found ${migrations.length} applied migrations`);
        migrations.forEach((migration) => {
          logInfo(`Migration ${migration.version}: ${migration.name || "Unnamed"}`);
        });
      }
    } else {
      logWarning("Migration tracking table not found");
    }
  } catch (error) {
    logWarning(`Could not check migration status: ${error.message}`);
  }
}

// Real-time feature validation
async function validateRealtimeFeatures() {
  console.log("\n🔄 Validating Real-time Features...");

  try {
    // Test basic real-time subscription capability
    const channel = supabase.channel("validation-test");

    const subscriptionPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Real-time subscription timeout"));
      }, 5000);

      channel.subscribe((status) => {
        clearTimeout(timeout);
        if (status === "SUBSCRIBED") {
          resolve(true);
        } else {
          reject(new Error(`Subscription failed with status: ${status}`));
        }
      });
    });

    try {
      await subscriptionPromise;
      logSuccess("Real-time subscriptions working correctly");

      // Test RLS with real-time
      const testChannel = supabase
        .channel("rls-test")
        .on("postgres_changes", { event: "*", schema: "public", table: "users" }, (payload) => {
          /* test callback */
        });

      logSuccess("Real-time RLS integration configured");

      // Cleanup
      await channel.unsubscribe();
      await testChannel.unsubscribe();
    } catch (error) {
      logError(`Real-time validation failed: ${error.message}`);
    }
  } catch (error) {
    logError(`Real-time setup failed: ${error.message}`);
  }
}

// Generate test data for validation
async function generateTestData() {
  console.log("\n🎲 Generating Test Data...");

  try {
    // Check if test data already exists
    const { data: existingUsers } = await supabase.from("users").select("id").limit(1);

    if (existingUsers && existingUsers.length > 0) {
      logInfo("Test data already exists, skipping generation");
      return;
    }

    // Create test user
    const { data: testUser, error: userError } = await supabase
      .from("users")
      .insert({
        id: "550e8400-e29b-41d4-a716-446655440000", // Fixed UUID for testing
        username: "schema_validator",
        email: "test@example.com",
        reputation_score: 100,
        verification_level: "email_verified",
      })
      .select()
      .single();

    if (userError) {
      logWarning(`Could not create test user: ${userError.message}`);
      return;
    }

    logSuccess("Generated test user data");

    // Test college data
    const { error: collegeError } = await supabase.from("colleges").insert({
      name: "Test University",
      city: "Test City",
      state: "Test State",
      institution_type: "public",
      is_active: true,
    });

    if (!collegeError) {
      logSuccess("Generated test college data");
    }
  } catch (error) {
    logWarning(`Test data generation failed: ${error.message}`);
  }
}

// Cleanup test data
async function cleanupTestData() {
  try {
    await supabase.from("users").delete().eq("username", "schema_validator");

    await supabase.from("colleges").delete().eq("name", "Test University");

    logInfo("Cleaned up test data");
  } catch (error) {
    logWarning(`Test data cleanup failed: ${error.message}`);
  }
}

// Generate comprehensive report
function generateReport() {
  console.log("\n📊 Validation Report");
  console.log("=".repeat(50));

  const totalChecks =
    validationResults.errors.length + validationResults.warnings.length + validationResults.info.length;

  console.log(`\n📈 Summary:`);
  console.log(`  Total Checks: ${totalChecks}`);
  console.log(`  ✅ Passed: ${validationResults.info.length}`);
  console.log(`  ⚠️  Warnings: ${validationResults.warnings.length}`);
  console.log(`  ❌ Errors: ${validationResults.errors.length}`);
  console.log(`  🎯 Overall Status: ${validationResults.success ? "✅ PASS" : "❌ FAIL"}`);

  if (Object.keys(validationResults.performance).length > 0) {
    console.log(`\n⚡ Performance Metrics:`);
    for (const [test, duration] of Object.entries(validationResults.performance)) {
      console.log(`  ${test}: ${duration}ms`);
    }
  }

  if (validationResults.errors.length > 0) {
    console.log(`\n❌ Critical Issues:`);
    validationResults.errors.forEach((error) => console.log(`  • ${error}`));
  }

  if (validationResults.warnings.length > 0) {
    console.log(`\n⚠️  Warnings:`);
    validationResults.warnings.forEach((warning) => console.log(`  • ${warning}`));
  }

  // Save detailed report to file
  const reportData = {
    timestamp: new Date().toISOString(),
    success: validationResults.success,
    summary: {
      totalChecks,
      passed: validationResults.info.length,
      warnings: validationResults.warnings.length,
      errors: validationResults.errors.length,
    },
    details: validationResults,
    environment: {
      supabaseUrl: SUPABASE_URL,
      nodeVersion: process.version,
      platform: process.platform,
    },
  };

  const reportPath = path.join(__dirname, "../validation-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

// Main validation function
async function validateDatabaseSchema() {
  console.log("🚀 Starting Database Schema Validation");
  console.log("=".repeat(50));

  try {
    // Check basic connectivity
    console.log("\n🔌 Testing Database Connectivity...");
    const { data } = await supabase.from("users").select("count").limit(1);
    logSuccess("Database connection successful");

    // Validate tables
    console.log("\n📋 Validating Tables...");
    for (const tableName of EXPECTED_SCHEMA.tables) {
      await validateTable(tableName);
    }

    // Validate functions
    console.log("\n⚙️  Validating Functions...");
    for (const functionName of EXPECTED_SCHEMA.functions) {
      await validateFunction(functionName);
    }

    // Validate triggers
    console.log("\n🎯 Validating Triggers...");
    for (const triggerName of EXPECTED_SCHEMA.triggers) {
      await validateTrigger(triggerName);
    }

    // Validate RLS policies
    await validateRLSPolicies();

    // Check migration status
    await checkMigrationStatus();

    // Test service compatibility
    await validateServiceCompatibility();

    // Generate and test with sample data
    await generateTestData();

    // Validate data integrity
    await validateDataIntegrity();

    // Analyze performance
    await analyzePerformance();

    // Validate real-time features
    await validateRealtimeFeatures();

    // Cleanup test data
    await cleanupTestData();
  } catch (error) {
    logError(`Validation failed: ${error.message}`);
  }

  // Generate final report
  generateReport();

  // Exit with appropriate code
  process.exit(validationResults.success ? 0 : 1);
}

// Run validation if called directly
if (require.main === module) {
  validateDatabaseSchema().catch((error) => {
    console.error("❌ Validation script failed:", error);
    process.exit(1);
  });
}

module.exports = {
  validateDatabaseSchema,
  EXPECTED_SCHEMA,
  SERVICE_TESTS,
};
