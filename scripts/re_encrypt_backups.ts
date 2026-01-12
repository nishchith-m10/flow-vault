/**
 * Re-encrypt backups using a new encryption key
 * Usage: FLOWVAULT_NEW_ENCRYPTION_KEY=... FLOWVAULT_OLD_ENCRYPTION_KEY=... NEW_KEY_VERSION=2 node ./scripts/re_encrypt_backups.ts
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in env
 */
import { createClient } from '@supabase/supabase-js';
import { decryptWorkflowData, encryptWorkflowData } from '@/lib/encryption';
import type { Database } from '@/lib/supabase/types';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const newKey = process.env.FLOWVAULT_NEW_ENCRYPTION_KEY;
  const oldKey = process.env.FLOWVAULT_OLD_ENCRYPTION_KEY || process.env.FLOWVAULT_ENCRYPTION_KEY;
  const newVersion = process.env.NEW_KEY_VERSION;

  // Parse CLI args for dry-run, confirm and limit
  const args: string[] = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const confirm = args.includes('--confirm');
  let limit = 0;
  const limitArg: string | undefined = args.find((a: string) => a.startsWith('--limit='));
  if (limitArg) {
    const v = parseInt(limitArg.split('=')[1], 10);
    if (!Number.isNaN(v) && v > 0) limit = v;
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
  }

  if (!newKey || !newVersion) {
    console.error('Missing new key or NEW_KEY_VERSION');
    process.exit(1);
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  // Fetch backups that do not have the target key version (NULL or different)
  let query = supabase
    .from('flowvault_workflow_backups')
    .select('*')
    .or(`encryption_key_version.is.null,encryption_key_version.neq.${newVersion}`);

  if (limit > 0) {
    query = query.limit(limit);
  }

  const { data: backups, error } = await query;
  if (error) {
    console.error('Failed to list backups:', error.message || error);
    process.exit(1);
  }

  if (!backups || backups.length === 0) {
    console.log('No backups to re-encrypt');
    return;
  }

  console.log(`Found ${backups.length} backups that would be re-encrypted to version '${newVersion}'.`);

  // If dry-run, list a sample and exit
  if (dryRun) {
    console.log('Dry-run mode: no changes will be made. Sample backups:');
    (backups as any[]).slice(0, 10).forEach((b: any) => console.log(` - ${b.id} (workflow: ${b.workflow_name || b.workflow_id})`));
    console.log('Run with --confirm to apply changes. Use --limit=N to limit processed items.');
    return;
  }

  if (!confirm) {
    console.log("No '--confirm' flag provided. Re-run with '--confirm' to apply changes.");
    return;
  }

  let processed = 0;

  for (const b of backups) {
    try {
      // If workflow_data looks like EncryptedData (has ciphertext, iv, salt, tag), try decrypt
      const dataCandidate: any = b.workflow_data;

      let decrypted: any = null;
      if (dataCandidate?.ciphertext && dataCandidate?.iv) {
        // Decrypt with old key
        const decResult = await decryptWorkflowData(dataCandidate, oldKey!);
        if (!decResult.success) {
          console.warn(`Skipping backup ${b.id}: failed to decrypt with old key: ${decResult.error}`);
          continue;
        }
        decrypted = decResult.data;
      } else {
        // Already plaintext JSON
        decrypted = dataCandidate;
      }

      const encResult = await encryptWorkflowData(decrypted, newKey);
      if (!encResult.success || !encResult.data) {
        console.warn(`Failed to encrypt backup ${b.id}: ${encResult.error}`);
        continue;
      }

      // Update row with new encrypted payload and version
      const { error: updErr } = await supabase
        .from('flowvault_workflow_backups')
        .update({ workflow_data: encResult.data, encryption_key_version: newVersion })
        .eq('id', b.id as string);

      if (updErr) {
        console.warn(`Failed to update backup ${b.id}: ${updErr.message || updErr}`);
        continue;
      }

      processed++;
    } catch (err) {
      console.warn(`Error processing backup ${b.id}:`, err);
    }
  }

  console.log(`Re-encryption finished. Processed ${processed}/${backups.length} backups.`);
}


main().catch(err => {
  console.error('Unexpected error', err);
  process.exit(1);
});