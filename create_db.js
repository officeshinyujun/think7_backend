
const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'qwer123456!@',
  port: 5432,
});

async function createDatabase() {
  try {
    await client.connect();
    // Check if database exists
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'think7'");
    if (res.rowCount === 0) {
      console.log("Database 'think7' does not exist. Creating...");
      await client.query('CREATE DATABASE think7');
      console.log("Database 'think7' created successfully.");
    } else {
      console.log("Database 'think7' already exists.");
    }
  } catch (err) {
    console.error('Error creating database:', err);
  } finally {
    await client.end();
  }
}

createDatabase();
