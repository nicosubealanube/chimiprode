import db from '@/lib/db';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'chimi2026';

function isAuthorized(request) {
  // Verificar token en Header
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token === ADMIN_PASSWORD) return true;
  }

  // Verificar token en Query Params (útil para descarga directa en navegador)
  const { searchParams } = new URL(request.url);
  const queryToken = searchParams.get('token');
  if (queryToken && queryToken.trim() === ADMIN_PASSWORD) {
    return true;
  }

  return false;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    // 1. Obtener todos los registros de la base de datos
    const usersRes = await db.execute('SELECT * FROM users');
    const matchesRes = await db.execute('SELECT * FROM matches');
    const predictionsRes = await db.execute('SELECT * FROM predictions');

    const backupData = {
      timestamp: new Date().toISOString(),
      users: usersRes.rows,
      matches: matchesRes.rows,
      predictions: predictionsRes.rows
    };

    // 2. Retornar como archivo descargable
    return new Response(JSON.stringify(backupData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="backup-chimi-prode.json"'
      }
    });

  } catch (error) {
    console.error('Error al generar backup:', error);
    return Response.json({ error: 'Error en el servidor al generar el backup.' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const { users, matches, predictions } = await request.json();

    if (!users || !Array.isArray(users) || !matches || !Array.isArray(matches) || !predictions || !Array.isArray(predictions)) {
      return Response.json({ error: 'Formato de backup inválido. Debe contener arreglos de users, matches y predictions.' }, { status: 400 });
    }

    const statements = [];

    // 1. Sentencias para limpiar la base de datos
    statements.push({ sql: 'DELETE FROM predictions', args: [] });
    statements.push({ sql: 'DELETE FROM matches', args: [] });
    statements.push({ sql: 'DELETE FROM users', args: [] });

    // 2. Sentencias para restaurar usuarios
    for (const u of users) {
      statements.push({
        sql: `INSERT INTO users (dni, nombre, apellido, celular, pago_aprobado, rol, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [u.dni, u.nombre, u.apellido, u.celular, Number(u.pago_aprobado), u.rol, u.created_at]
      });
    }

    // 3. Sentencias para restaurar partidos (conservando los IDs originales)
    for (const m of matches) {
      statements.push({
        sql: `INSERT INTO matches (id, equipo_a, equipo_b, grupo_fase, fecha_hora, goles_a, goles_b, estado)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          Number(m.id),
          m.equipo_a,
          m.equipo_b,
          m.grupo_fase,
          m.fecha_hora,
          m.goles_a !== null ? Number(m.goles_a) : null,
          m.goles_b !== null ? Number(m.goles_b) : null,
          m.estado
        ]
      });
    }

    // 4. Sentencias para restaurar predicciones (conservando IDs y relaciones)
    for (const p of predictions) {
      statements.push({
        sql: `INSERT INTO predictions (id, user_dni, match_id, goles_a, goles_b, puntos_obtenidos, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          Number(p.id),
          p.user_dni,
          Number(p.match_id),
          Number(p.goles_a),
          Number(p.goles_b),
          p.puntos_obtenidos !== null ? Number(p.puntos_obtenidos) : null,
          p.updated_at
        ]
      });
    }

    // 5. Ejecutar toda la restauración en una transacción por lotes (batch)
    await db.batch(statements, "write");

    return Response.json({
      success: true,
      message: 'Base de datos restaurada exitosamente.',
      stats: {
        users: users.length,
        matches: matches.length,
        predictions: predictions.length
      }
    });

  } catch (error) {
    console.error('Error al restaurar backup:', error);
    return Response.json({ error: `Error en la base de datos: ${error.message}` }, { status: 500 });
  }
}
