/**
 * Cryptographic Digital Evidence Vault - Tamper Demonstration Script
 * Designed for College Viva, Security Audits, and Forensic Demonstrations.
 *
 * This script demonstrates the two core cryptographic defense mechanisms:
 * 1. SHA-256 Storage Verification Tampering:
 *    Silently modifies an evidence file's sealed database hash or stored buffer,
 *    causing the "Verify File" endpoint to immediately return "TAMPERED".
 * 2. Immutable Hash-Chained Audit Log Tampering:
 *    Simulates a rogue DBA attack by temporarily disabling database triggers
 *    and altering an audit log row's metadata, causing the "Verify Audit Chain"
 *    recalculation algorithm to immediately flag the broken chain link.
 *
 * Usage:
 *   node scripts/tamper-demo.js --status           # Inspect vault & chain integrity
 *   node scripts/tamper-demo.js --tamper-file      # Tamper latest evidence record
 *   node scripts/tamper-demo.js --tamper-audit     # Tamper an audit log entry
 *   node scripts/tamper-demo.js --restore          # Heal/restore tampered records
 */

const { getClient, pool, query } = require('../src/db');
const { verifyDatabaseAuditChain } = require('../src/services/audit.service');
const { computeSHA256 } = require('../src/utils/crypto');

// Backup store to allow restoring records during live viva demos
const backupFile = {
  evidenceId: null,
  originalHash: null,
};

const backupAudit = {
  auditId: null,
  originalMetadata: null,
  originalEntryHash: null,
};

async function showStatus() {
  console.log('\n===============================================================');
  console.log('🛡️  CRYPTOGRAPHIC EVIDENCE VAULT — INTEGRITY STATUS REPORT');
  console.log('===============================================================');

  // 1. Evidence Records
  const evidenceRes = await query(
    'SELECT id, case_number, title, file_name, sha256_hash, status FROM evidence ORDER BY created_at DESC LIMIT 5'
  );
  console.log(`\n📦 Evidence Records in Vault: ${evidenceRes.rows.length}`);
  evidenceRes.rows.forEach((row, idx) => {
    console.log(
      `   [${idx + 1}] ID: ${row.id} | Case: ${row.case_number} | Status: ${row.status}`
    );
    console.log(`       File: ${row.file_name} | Sealed Hash: ${row.sha256_hash}`);
  });

  // 2. Audit Chain Verification
  console.log('\n⛓️  Running Cryptographic Audit Chain Verification...');
  const auditRes = await verifyDatabaseAuditChain();

  if (auditRes.verified) {
    console.log('   ✅ AUDIT CHAIN STATUS: 100% INTACT (No Tampering Detected)');
    console.log(`      Total Blocks Verified: ${auditRes.totalChecked}`);
    console.log(`      Latest Entry Hash:     ${auditRes.latestEntryHash}`);
  } else {
    console.log('   ❌ AUDIT CHAIN STATUS: BROKEN / TAMPERED!');
    console.log(`      Broken at Entry ID:   #${auditRes.brokenAtId}`);
    console.log(`      Forensic Reason:      ${auditRes.reason}`);
  }
  console.log('===============================================================\n');
}

async function tamperEvidenceFile() {
  console.log('\n🚨 [DEMO 1] Tampering with Stored Evidence File...');

  const evidenceRes = await query(
    'SELECT id, case_number, file_name, sha256_hash FROM evidence ORDER BY created_at DESC LIMIT 1'
  );

  if (evidenceRes.rows.length === 0) {
    console.log('   ⚠️ No evidence records found to tamper with. Upload an evidence file first!');
    return;
  }

  const record = evidenceRes.rows[0];
  backupFile.evidenceId = record.id;
  backupFile.originalHash = record.sha256_hash;

  // Deliberately flip characters in the hash to simulate silent storage corruption/bit-flip
  const corruptedHash = 'deadbeef' + record.sha256_hash.slice(8);

  await query('UPDATE evidence SET sha256_hash = $1 WHERE id = $2', [
    corruptedHash,
    record.id,
  ]);

  console.log(`   🎯 Targeted Evidence: [${record.case_number}] ${record.file_name}`);
  console.log(`   🔒 Original Sealed Hash:  ${record.sha256_hash}`);
  console.log(`   ⚠️ Corrupted Vault Hash:  ${corruptedHash}`);
  console.log('\n✅ TAMPER COMPLETE!');
  console.log('👉 Next Step: Open the UI or trigger POST /api/evidence/' + record.id + '/verify');
  console.log('   The system will compare the storage file with the DB and trigger the RED "TAMPERED" card!\n');
}

async function tamperAuditChain() {
  console.log('\n🚨 [DEMO 2] Tampering with Immutable Audit Log Chain (Rogue DBA Attack)...');

  const auditRes = await query(
    'SELECT id, action, metadata, entry_hash FROM audit_logs WHERE id > 1 ORDER BY id DESC LIMIT 1'
  );

  if (auditRes.rows.length === 0) {
    console.log('   ⚠️ Insufficient audit log entries. Perform at least 1 login or upload action first.');
    return;
  }

  const targetLog = auditRes.rows[0];
  backupAudit.auditId = targetLog.id;
  backupAudit.originalMetadata = targetLog.metadata;
  backupAudit.originalEntryHash = targetLog.entry_hash;

  console.log(`   🎯 Targeted Audit Log Entry: ID #${targetLog.id} [${targetLog.action}]`);
  console.log(`   📄 Original Metadata:`, JSON.stringify(targetLog.metadata));

  const client = await getClient();
  try {
    // Note: The database has trigger `trg_prevent_audit_log_modification` which aborts UPDATEs!
    // A malicious superuser would attempt to bypass this trigger to rewrite history:
    console.log('   ⚠️ Simulating superuser bypass of DB immutability trigger...');
    await client.query('ALTER TABLE audit_logs DISABLE TRIGGER trg_prevent_audit_log_modification;');

    // Alter the metadata payload (e.g. erasing an incriminating badge ID or case reference)
    const alteredMetadata = {
      ...targetLog.metadata,
      tampered_by_adversary: true,
      altered_at: new Date().toISOString(),
      original_record_suppressed: true,
    };

    await client.query('UPDATE audit_logs SET metadata = $1 WHERE id = $2', [
      JSON.stringify(alteredMetadata),
      targetLog.id,
    ]);

    // Re-enable the immutability trigger
    await client.query('ALTER TABLE audit_logs ENABLE TRIGGER trg_prevent_audit_log_modification;');

    console.log('   ⚠️ Metadata was altered directly in PostgreSQL!');
    console.log('   📄 Altered Metadata:', JSON.stringify(alteredMetadata));
    console.log('\n✅ AUDIT LOG TAMPER COMPLETE!');
    console.log('👉 Next Step: Click "Verify Audit Chain" on the DCP Dashboard or run:');
    console.log('   node scripts/tamper-demo.js --status');
    console.log('   The cryptographic hash calculation will mathematically fail and flag Entry #' + targetLog.id + '!\n');
  } catch (err) {
    console.error('   ❌ Tampering failed:', err.message);
  } finally {
    client.release();
  }
}

async function restoreVault() {
  console.log('\n🔄 Restoring Vault & Audit Log to Clean Untampered State...');

  // 1. Restore evidence if tampered
  const tamperedEv = await query("SELECT id FROM evidence WHERE sha256_hash LIKE 'deadbeef%'");
  if (tamperedEv.rows.length > 0) {
    for (const row of tamperedEv.rows) {
      // Re-download from storage to re-establish true hash
      const storageService = require('../src/services/storage.service');
      const evDetail = await query('SELECT storage_path FROM evidence WHERE id = $1', [row.id]);
      try {
        const buf = await storageService.downloadFile(evDetail.rows[0].storage_path);
        const correctHash = computeSHA256(buf);
        await query('UPDATE evidence SET sha256_hash = $1 WHERE id = $2', [correctHash, row.id]);
        console.log(`   ✅ Restored evidence record ${row.id} to valid hash: ${correctHash}`);
      } catch (e) {
        console.warn(`   ⚠️ Could not restore evidence ${row.id}:`, e.message);
      }
    }
  } else {
    console.log('   ℹ️ No tampered evidence records found.');
  }

  // 2. Re-compute audit entries if tampered
  console.log('\n   Verifying audit chain after restore...');
  const check = await verifyDatabaseAuditChain();
  if (!check.verified) {
    console.log(`   ⚠️ Audit chain is currently broken at #${check.brokenAtId}.`);
    console.log('   To reset audit logs completely for a fresh evaluation, run:');
    console.log('   npm run migrate && npm run seed');
  } else {
    console.log('   ✅ Audit chain is completely valid and verified.');
  }
}

async function main() {
  const arg = process.argv[2];

  try {
    if (arg === '--tamper-file') {
      await tamperEvidenceFile();
    } else if (arg === '--tamper-audit') {
      await tamperAuditChain();
    } else if (arg === '--restore') {
      await restoreVault();
    } else if (arg === '--status') {
      await showStatus();
    } else {
      console.log('\n===============================================================');
      console.log('🛡️  EVIDENCE VAULT TAMPER DEMONSTRATION TOOLKIT (VIVA)');
      console.log('===============================================================');
      console.log('Choose an action to demonstrate cryptographic tamper-evidence:');
      console.log('  node scripts/tamper-demo.js --status        Check vault & chain state');
      console.log('  node scripts/tamper-demo.js --tamper-file   Corrupt evidence file hash');
      console.log('  node scripts/tamper-demo.js --tamper-audit  Corrupt audit log chain');
      console.log('  node scripts/tamper-demo.js --restore       Restore clean state');
      console.log('===============================================================\n');
      await showStatus();
    }
  } catch (err) {
    console.error('❌ Execution error:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();

