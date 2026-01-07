// scripts/re_encrypt_backups.ts

import { createClient } from '@supabase/supabase-js';
import { program } from 'commander';

// Placeholder for the actual encryption/decryption logic
// In a real implementation, this would be replaced with the actual crypto library
const DUMMY_ENCRYPTION_KEY = 'dummy-key';
const DUMMY_NEW_ENCRYPTION_KEY = 'dummy-new-key';

async function decrypt(data: string, key: string): Promise<string> {
  // Replace with actual decryption logic
  return `decrypted_${data}_with_${key}`;
}

async function encrypt(data: string, key: string): Promise<string> {
  // Replace with actual encryption logic
  return `encrypted_${data}_with_${key}`;
}

async function main() {
  program
    .option('--dry-run', 'Simulate the re-encryption process without making changes', false)
    .option('--limit <number>', 'Limit the number of backups to process', '10')
    .option('--confirm', 'Confirm the re-encryption process', false)
    .parse(process.argv);

  const options = program.opts();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key'
  );

  const { data: activeKey, error: activeKeyError } = await supabase
    .from('flowvault_key_metadata')
    .select('key_version')
    .eq('active', true)
    .single();

  if (activeKeyError) {
    console.error('Error fetching active key:', activeKeyError);
    return;
  }

  const currentKeyVersion = activeKey.key_version;

  const { data: backups, error: backupsError } = await supabase
    .from('flowvault_workflow_backups')
    .select('id, backup_data, encryption_key_version')
    .neq('encryption_key_version', currentKeyVersion)
    .limit(parseInt(options.limit, 10));

  if (backupsError) {
    console.error('Error fetching backups:', backupsError);
    return;
  }

  if (backups.length === 0) {
    console.log('No backups to re-encrypt.');
    return;
  }

  console.log(`Found ${backups.length} backups to re-encrypt.`);

  if (options.dryRun) {
    console.log('Dry run enabled. No changes will be made.');
    for (const backup of backups) {
      console.log(`- Backup ${backup.id}: would be re-encrypted from version ${backup.encryption_key_version} to ${currentKeyVersion}`);
    }
    return;
  }

  if (!options.confirm) {
    console.log('This will re-encrypt the backups. Run with --confirm to proceed.');
    return;
  }

  for (const backup of backups) {
    try {
      // In a real implementation, you would need a key management system to get the old key
      const oldKey = process.env[`ENCRYPTION_KEY_${backup.encryption_key_version}`] || DUMMY_ENCRYPTION_KEY;
      const newKey = process.env[`ENCRYPTION_KEY_${currentKeyVersion}`] || DUMMY_NEW_ENCRYPTION_KEY;

      const decryptedData = await decrypt(backup.backup_data, oldKey);
      const encryptedData = await encrypt(decryptedData, newKey);

      const { error: updateError } = await supabase
        .from('flowvault_workflow_backups')
        .update({
          backup_data: encryptedData,
          encryption_key_version: currentKeyVersion,
        })
        .eq('id', backup.id);

      if (updateError) {
        console.error(`Error updating backup ${backup.id}:`, updateError);
      } else {
        console.log(`- Backup ${backup.id}: re-encrypted successfully.`);
      }
    } catch (error) {
      console.error(`Failed to process backup ${backup.id}:`, error);
    }
  }

  console.log('Re-encryption process complete.');
}

main().catch(console.error);
