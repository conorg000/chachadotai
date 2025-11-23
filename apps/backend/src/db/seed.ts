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

    console.log('\nSeed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
