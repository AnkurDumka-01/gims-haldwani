const pool = require('../db');

async function logAction(actorId, action, entityType, entityId, meta = {}) {
  await pool.query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, meta)
     VALUES ($1, $2, $3, $4, $5)`,
    [actorId, action, entityType, entityId, meta]
  );
}

module.exports = { logAction };
