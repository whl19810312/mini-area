const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

async function addForegroundLayer() {
  try {
    console.log('Adding foregroundLayer field to maps table...');
    
    // Add foregroundLayer column
    try {
      await sequelize.query(`
        ALTER TABLE maps 
        ADD COLUMN IF NOT EXISTS "foregroundLayer" JSONB
      `);
      console.log('✓ foregroundLayer column added');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✓ foregroundLayer column already exists');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Foreground layer migration completed successfully');
  } catch (error) {
    console.error('❌ Foreground layer migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  addForegroundLayer()
    .then(() => {
      console.log('✨ Database is ready with foreground layer support!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = addForegroundLayer;