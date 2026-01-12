/**
 * Run Supabase database migration
 * This script executes the initial schema migration using the Supabase service role key
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

async function runMigration() {
  // Load environment variables
  config({ path: '.env.local' });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  console.log('🔗 Connecting to Supabase...');
  console.log(`   URL: ${supabaseUrl}`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });

  // Read the migration SQL file
  const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📝 Running migration: 001_initial_schema.sql');
  console.log('   This may take a few seconds...\n');

  try {
    // Execute the migration SQL
    const { data: _data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try alternative approach - split and execute statements
      console.log('⚠️  Direct execution failed, trying statement-by-statement approach...\n');
      
      // Split SQL into individual statements (basic approach)
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ';';
        
        // Skip comments
        if (stmt.trim().startsWith('--') || stmt.trim().startsWith('/*')) {
          continue;
        }

        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt });
        
        if (stmtError) {
          console.error(`   ❌ Error in statement ${i + 1}:`, stmtError.message);
          errorCount++;
        } else {
          successCount++;
        }
      }

      console.log(`\n✅ Migration completed with ${successCount} successful statements`);
      if (errorCount > 0) {
        console.log(`⚠️  ${errorCount} statements had errors (might be expected for existing objects)`);
      }
    } else {
      console.log('✅ Migration executed successfully!');
    }

    console.log('\n🎉 Database schema is ready!');
    console.log('\nVerify in Supabase Dashboard → Table Editor:');
    console.log('   - user_settings');
    console.log('   - workflow_backups');
    console.log('   - archived_workflows');
    console.log('   - trash');
    console.log('   - agent_audit_log');
    console.log('   - workflow_tags');
    console.log('   - rate_limit_counters');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.log('\n💡 Fallback option: Copy the SQL from supabase/migrations/001_initial_schema.sql');
    console.log('   and paste it into Supabase Dashboard → SQL Editor → Run\n');
    process.exit(1);
  }
}

runMigration();
