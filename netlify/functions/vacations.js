
const { Client } = require('pg');

exports.handler = async function(event, context) {
  const client = new Client({
    connectionString: process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Crear tablas si no existen
    await client.query(`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );
      CREATE TABLE IF NOT EXISTS vacations (
        id SERIAL PRIMARY KEY,
        employee TEXT NOT NULL,
        replacement TEXT,
        start DATE NOT NULL,
        "end" DATE NOT NULL,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    if (event.httpMethod === 'GET') {
      const membersRes = await client.query('SELECT name FROM members ORDER BY name ASC');
      const vacationsRes = await client.query('SELECT id, employee, replacement, start, "end" as end FROM vacations ORDER BY start ASC');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          members: membersRes.rows.map(r => r.name),
          vacations: vacationsRes.rows
        })
      };
    }

    if (event.httpMethod === 'POST') {
      const { type, payload } = JSON.parse(event.body || '{}');

      if (type === 'add-member') {
        const name = (payload && payload.name || '').trim();
        if (!name) return { statusCode: 400, body: 'Nombre requerido' };
        await client.query('INSERT INTO members(name) VALUES($1) ON CONFLICT DO NOTHING', [name]);
        return { statusCode: 200, body: JSON.stringify({ message: 'member added' }) };
      }

      if (type === 'save-vacation') {
        const { employee, replacement, start, end } = payload || {};
        if (!employee || !start || !end) return { statusCode: 400, body: 'Datos insuficientes' };
        await client.query(
          'INSERT INTO vacations(employee, replacement, start, "end") VALUES($1, $2, $3, $4)',
          [employee, replacement || null, start, end]
        );
        return { statusCode: 200, body: JSON.stringify({ message: 'vacation saved' }) };
      }

      if (type === 'delete-vacation') {
        const id = payload && payload.id;
        if (!id) return { statusCode: 400, body: 'ID requerido' };
        await client.query('DELETE FROM vacations WHERE id=$1', [id]);
        return { statusCode: 200, body: JSON.stringify({ message: 'vacation deleted' }) };
      }

      if (type === 'reset-all') {
        await client.query('TRUNCATE TABLE vacations');
        await client.query('TRUNCATE TABLE members');
        await client.query('INSERT INTO members(name) VALUES($1) ON CONFLICT DO NOTHING', ['Carlos Ruiz']);
        return { statusCode: 200, body: JSON.stringify({ message: 'reset done' }) };
      }

      return { statusCode: 400, body: 'Tipo no soportado' };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Server error: ' + err.message };
  } finally {
    try { await client.end(); } catch (_) {}
  }
};
