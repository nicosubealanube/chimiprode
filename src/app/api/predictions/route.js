import db from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dni = searchParams.get('dni');

    if (!dni) {
      return Response.json({ error: 'El DNI del usuario es requerido.' }, { status: 400 });
    }

    // Traer todos los partidos y juntarlos con las predicciones del usuario
    const matchesRes = await db.execute({
      sql: `
        SELECT 
          m.id, 
          m.equipo_a, 
          m.equipo_b, 
          m.grupo_fase, 
          m.fecha_hora, 
          m.goles_a as goles_reales_a, 
          m.goles_b as goles_reales_b, 
          m.estado,
          p.goles_a as goles_prediccion_a,
          p.goles_b as goles_prediccion_b,
          p.puntos_obtenidos
        FROM matches m
        LEFT JOIN predictions p ON m.id = p.match_id AND p.user_dni = ?
        ORDER BY m.fecha_hora ASC
      `,
      args: [dni]
    });

    const matches = matchesRes.rows;
    return Response.json({ success: true, matches });
  } catch (error) {
    console.error('Error al obtener partidos:', error);
    return Response.json({ error: 'Error en el servidor.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { dni, predictions } = await request.json();

    if (!dni) {
      return Response.json({ error: 'El DNI del usuario es requerido.' }, { status: 400 });
    }

    if (!predictions || !Array.isArray(predictions)) {
      return Response.json({ error: 'Formato de predicciones inválido.' }, { status: 400 });
    }

    // Verificar si el usuario existe y está aprobado/registrado
    const userRes = await db.execute({
      sql: 'SELECT * FROM users WHERE dni = ?',
      args: [dni]
    });
    const user = userRes.rows[0];
    if (!user) {
      return Response.json({ error: 'Usuario no registrado.' }, { status: 404 });
    }

    const now = new Date();
    const errors = [];
    const saved = [];
    const statements = [];

    // Cargar todos los partidos referenciados para validación local
    const matchIds = predictions
      .map(p => p.matchId)
      .filter(id => id !== undefined && id !== null);

    let dbMatches = [];
    if (matchIds.length > 0) {
      const placeholders = matchIds.map(() => '?').join(',');
      const dbMatchesRes = await db.execute({
        sql: `SELECT * FROM matches WHERE id IN (${placeholders})`,
        args: matchIds
      });
      dbMatches = dbMatchesRes.rows;
    }

    for (const pred of predictions) {
      const { matchId, golesA, golesB } = pred;

      if (golesA === null || golesA === undefined || golesB === null || golesB === undefined || golesA === '' || golesB === '') {
        continue; // Saltar si los goles están vacíos
      }

      const match = dbMatches.find(m => Number(m.id) === Number(matchId));
      if (!match) {
        errors.push(`El partido con ID ${matchId} no existe.`);
        continue;
      }

      // Verificar el bloqueo por horario (1 hora antes)
      const matchTime = new Date(match.fecha_hora);
      const limitTime = new Date(matchTime.getTime() - 1 * 60 * 60 * 1000);
      if (now >= limitTime || match.estado === 'jugado') {
        errors.push(`El partido ${match.equipo_a} vs ${match.equipo_b} ya comenzó o falta menos de 1 hora para su inicio. No podés cambiar tu predicción.`);
        continue;
      }

      const cleanGolesA = parseInt(golesA, 10);
      const cleanGolesB = parseInt(golesB, 10);

      if (isNaN(cleanGolesA) || isNaN(cleanGolesB)) {
        errors.push(`Los goles para ${match.equipo_a} vs ${match.equipo_b} deben ser números.`);
        continue;
      }

      statements.push({
        sql: `
          INSERT INTO predictions (user_dni, match_id, goles_a, goles_b, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_dni, match_id) DO UPDATE SET
            goles_a = excluded.goles_a,
            goles_b = excluded.goles_b,
            updated_at = excluded.updated_at
        `,
        args: [dni, matchId, cleanGolesA, cleanGolesB, now.toISOString()]
      });
      saved.push(matchId);
    }

    if (statements.length > 0) {
      await db.batch(statements, "write");
    }

    if (errors.length > 0 && saved.length === 0) {
      return Response.json({ error: errors.join(' ') }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: 'Predicciones guardadas exitosamente.',
      savedCount: saved.length,
      warnings: errors.length > 0 ? errors.join(' ') : null
    });
  } catch (error) {
    console.error('Error al guardar predicciones:', error);
    return Response.json({ error: 'Error en el servidor.' }, { status: 500 });
  }
}
