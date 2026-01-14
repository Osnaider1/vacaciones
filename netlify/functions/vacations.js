
// netlify/functions/vacations.js
import { neon } from '@netlify/neon';

/* -------------------------------------------
   Helpers para respuestas HTTP
-------------------------------------------- */
const json = (status, data) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
});

const text = (status, msg) => ({
  statusCode: status,
  body: msg
});

/* -------------------------------------------
   Crear tablas si no existen
-------------------------------------------- */
async function ensureSchema(sql) {
  await sql/*sql*/`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    )
  `;
  await sql/*sql*/`
    CREATE TABLE IF NOT EXISTS vacations (
      id SERIAL PRIMARY KEY,
      employee TEXT NOT NULL,
      replacement TEXT,
      start DATE NOT NULL,
      "end" DATE NOT NULL,
      created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

/* -------------------------------------------
   Handler principal (GET, POST)
-------------------------------------------- */
export const handler = async (event) => {
  try {
    // Crea la conexión a Neon (usa NETLIFY_DATABASE_URL automáticamente)
    const sql = neon();

    // Crear tablas si aún no existen
    await ensureSchema(sql);

    /* ------------------------------------
       GET → obtener miembros y vacaciones
    ------------------------------------- */
    if (event.httpMethod === "GET") {
      const membersRows = await sql/*sql*/`
        SELECT name FROM members ORDER BY name ASC
      `;

      const vacationsRows = await sql/*sql*/`
        SELECT id, employee, replacement, start, "end" AS end
        FROM vacations
        ORDER BY start ASC
      `;

      return json(200, {
        members: membersRows.map(r => r.name),
        vacations: vacationsRows
      });
    }

    /* ------------------------------------
       POST → acciones enviadas por el front
    ------------------------------------- */
    if (event.httpMethod === "POST") {
      const { type, payload } = JSON.parse(event.body || "{}");

      // 🔹 Añadir miembro
      if (type === "add-member") {
        const name = (payload?.name || "").trim();
        if (!name) return text(400, "Nombre requerido");

        await sql/*sql*/`
          INSERT INTO members(name)
          VALUES (${name})
          ON CONFLICT DO NOTHING
        `;
        return text(200, "member added");
      }

      // 🔹 Guardar vacaciones
      if (type === "save-vacation") {
        const { employee, replacement, start, end } = payload || {};
        if (!employee || !start || !end)
          return text(400, "Datos insuficientes");

        await sql/*sql*/`
          INSERT INTO vacations(employee, replacement, start, "end")
          VALUES(${employee}, ${replacement || null}, ${start}, ${end})
        `;
        return text(200, "vacation saved");
      }

      // 🔹 Eliminar vacaciones
      if (type === "delete-vacation") {
        const id = payload?.id;
        if (!id) return text(400, "ID requerido");

        await sql/*sql*/`DELETE FROM vacations WHERE id = ${id}`;
        return text(200, "vacation deleted");
      }

      // 🔹 Resetear todo (YA NO SE USA, PERO LO DEJO OPCIONAL)
      if (type === "reset-all") {
        await sql/*sql*/`TRUNCATE TABLE vacations`;
        await sql/*sql*/`TRUNCATE TABLE members`;
        await sql/*sql*/`
          INSERT INTO members(name) VALUES('Carlos Ruiz')
          ON CONFLICT DO NOTHING
        `;
        return text(200, "reset done");
      }

      return text(400, "Tipo no soportado");
    }

    return text(405, "Method Not Allowed");

  } catch (err) {
    console.error("❌ Error en función vacations:", err);
    return text(500, "Server error: " + err.message);
  }
};
