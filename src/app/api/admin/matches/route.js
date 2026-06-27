import db from '@/lib/db';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'chimi2026';

function isAuthorized(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '').trim();
  return token === ADMIN_PASSWORD;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const matchesRes = await db.execute('SELECT * FROM matches ORDER BY fecha_hora ASC');
    const matches = matchesRes.rows;
    return Response.json({ success: true, matches });
  } catch (error) {
    console.error('Error al obtener partidos admin:', error);
    return Response.json({ error: 'Error en el servidor.' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      const { equipoA, equipoB, grupoFase, fechaHora } = body;
      if (!equipoA || !equipoA.trim() || !equipoB || !equipoB.trim() || !grupoFase || !grupoFase.trim() || !fechaHora) {
        return Response.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
      }

      await db.execute({
        sql: `INSERT INTO matches (equipo_a, equipo_b, grupo_fase, fecha_hora, estado)
              VALUES (?, ?, ?, ?, 'pendiente')`,
        args: [equipoA.trim(), equipoB.trim(), grupoFase.trim(), fechaHora]
      });

      return Response.json({ success: true, message: 'Partido creado exitosamente.' });
    }

    const { matchId, golesA, golesB, estado } = body;

    if (matchId === undefined) {
      return Response.json({ error: 'ID de partido requerido.' }, { status: 400 });
    }

    // Si el estado es 'pendiente', podemos resetear los goles
    const cleanGolesA = (golesA !== null && golesA !== undefined && golesA !== '') ? parseInt(golesA, 10) : null;
    const cleanGolesB = (golesB !== null && golesB !== undefined && golesB !== '') ? parseInt(golesB, 10) : null;
    const cleanEstado = estado || (cleanGolesA !== null && cleanGolesB !== null ? 'jugado' : 'pendiente');

    const statements = [];

    // 1. Agregar actualización del partido
    statements.push({
      sql: `
        UPDATE matches 
        SET goles_a = ?, goles_b = ?, estado = ? 
        WHERE id = ?
      `,
      args: [cleanGolesA, cleanGolesB, cleanEstado, matchId]
    });

    // 2. Si el partido está jugado, calcular los puntos para todas las predicciones de este partido
    if (cleanEstado === 'jugado' && cleanGolesA !== null && cleanGolesB !== null) {
      const predictionsRes = await db.execute({
        sql: 'SELECT * FROM predictions WHERE match_id = ?',
        args: [matchId]
      });
      const predictions = predictionsRes.rows;

      const realWinner = cleanGolesA > cleanGolesB ? 'A' : (cleanGolesB > cleanGolesA ? 'B' : 'Draw');

      for (const pred of predictions) {
        const predGolesA = pred.goles_a;
        const predGolesB = pred.goles_b;
        
        let points = 0;
        const predWinner = predGolesA > predGolesB ? 'A' : (predGolesB > predGolesA ? 'B' : 'Draw');

        if (predGolesA === cleanGolesA && predGolesB === cleanGolesB) {
          points = 3; // Resultado exacto
        } else if (realWinner === predWinner) {
          points = 1; // Solo ganador / empate acertado
        } else {
          points = 0; // No acertó
        }

        statements.push({
          sql: `
            UPDATE predictions 
            SET puntos_obtenidos = ? 
            WHERE id = ?
          `,
          args: [points, pred.id]
        });
      }
    } else {
      // Si el partido volvió a estar 'pendiente', reseteamos los puntos de las predicciones
      statements.push({
        sql: `
          UPDATE predictions 
          SET puntos_obtenidos = NULL 
          WHERE match_id = ?
        `,
        args: [matchId]
      });
    }

    // Ejecutar lote de actualización
    await db.batch(statements, "write");

    return Response.json({ 
      success: true, 
      message: 'Partido actualizado y puntajes recalculados exitosamente.' 
    });
  } catch (error) {
    console.error('Error en admin matches POST:', error);
    return Response.json({ error: 'Error en el servidor.' }, { status: 500 });
  }
}
