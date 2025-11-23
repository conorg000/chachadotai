import { query, pool } from './connection.js';
import crypto from 'crypto';

function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

async function seed() {
  console.log('Seeding database...');

  try {
    // Create a dev project
    const devProjectId = 'dev-project';
    const devApiKey = 'dev-key-12345';
    const devApiKeyHash = hashApiKey(devApiKey);

    await query(
      `INSERT INTO projects (id, name, api_key_hash, settings)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name,
           api_key_hash = EXCLUDED.api_key_hash`,
      [devProjectId, 'Development Project', devApiKeyHash, JSON.stringify({})]
    );

    console.log('Created dev project:');
    console.log(`  ID: ${devProjectId}`);
    console.log(`  API Key: ${devApiKey}`);

    // Create default policies for the dev project
    console.log('\nCreating default policies...');

    // Policy 1: Block Critical Threats (high risk score)
    const policy1Id = 'pol_block_critical';
    await query(
      `INSERT INTO policies (id, project_id, name, enabled, conditions, actions)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name,
           enabled = EXCLUDED.enabled,
           conditions = EXCLUDED.conditions,
           actions = EXCLUDED.actions`,
      [
        policy1Id,
        devProjectId,
        'Block Critical Threats',
        true,
        JSON.stringify({
          minRiskScore: 0.8,
        }),
        JSON.stringify({
          action: 'block',
          message: 'Session blocked due to critical risk level',
        }),
      ]
    );
    console.log(`  ✓ Created policy: Block Critical Threats (risk >= 0.8)`);

    // Policy 2: Flag Deception Attempts (pattern-based)
    const policy2Id = 'pol_flag_deception';
    await query(
      `INSERT INTO policies (id, project_id, name, enabled, conditions, actions)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name,
           enabled = EXCLUDED.enabled,
           conditions = EXCLUDED.conditions,
           actions = EXCLUDED.actions`,
      [
        policy2Id,
        devProjectId,
        'Flag Deception Attempts',
        true,
        JSON.stringify({
          patternsAny: ['cot_deception', 'manipulation', 'social_engineering'],
        }),
        JSON.stringify({
          action: 'flag',
          message: 'Potential deception detected',
        }),
      ]
    );
    console.log(`  ✓ Created policy: Flag Deception Attempts`);

    // Policy 3: Notify on High Risk (medium-high risk)
    const policy3Id = 'pol_notify_high_risk';
    await query(
      `INSERT INTO policies (id, project_id, name, enabled, conditions, actions)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name,
           enabled = EXCLUDED.enabled,
           conditions = EXCLUDED.conditions,
           actions = EXCLUDED.actions`,
      [
        policy3Id,
        devProjectId,
        'Notify on High Risk',
        true,
        JSON.stringify({
          minRiskScore: 0.6,
          maxRiskScore: 0.79,
        }),
        JSON.stringify({
          action: 'notify',
          message: 'High risk activity detected',
        }),
      ]
    );
    console.log(`  ✓ Created policy: Notify on High Risk (0.6 <= risk < 0.8)`);

    // Policy 4: Flag Privilege Escalation Patterns
    const policy4Id = 'pol_flag_privilege_escalation';
    await query(
      `INSERT INTO policies (id, project_id, name, enabled, conditions, actions)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name,
           enabled = EXCLUDED.enabled,
           conditions = EXCLUDED.conditions,
           actions = EXCLUDED.actions`,
      [
        policy4Id,
        devProjectId,
        'Flag Privilege Escalation',
        true,
        JSON.stringify({
          patternsAny: ['privilege_escalation', 'unauthorized_access', 'credential_theft'],
        }),
        JSON.stringify({
          action: 'flag',
          message: 'Privilege escalation attempt detected',
        }),
      ]
    );
    console.log(`  ✓ Created policy: Flag Privilege Escalation`);

    console.log('\nSeed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
