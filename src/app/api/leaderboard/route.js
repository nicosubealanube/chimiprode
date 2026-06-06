import db from '@/lib/db';

export async function GET() {
  try {
    // Consulta SQL agregada para obtener los puntajes del ranking
    // Ordenamos por:
    // 1. Puntos totales (descendente)
    // 2. Cantidad de resultados exactos de 3 puntos (descendente) como primer desempate
    // 3. Nombre/Apellido alfabéticamente
    const leaderboardRes = await db.execute(`
      SELECT 
        u.dni,
        u.nombre,
        u.apellido,
        SUM(CASE WHEN p.puntos_obtenidos = 3 THEN 1 ELSE 0 END) as exactos,
        SUM(CASE WHEN p.puntos_obtenidos = 1 THEN 1 ELSE 0 END) as aciertos,
        SUM(COALESCE(p.puntos_obtenidos, 0)) as puntos_totales
      FROM users u
      LEFT JOIN predictions p ON u.dni = p.user_dni
      WHERE u.pago_aprobado = 1 AND u.rol = 'user'
      GROUP BY u.dni
      ORDER BY puntos_totales DESC, exactos DESC, u.apellido ASC, u.nombre ASC
    `);

    const leaderboard = leaderboardRes.rows;
    return Response.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Error al obtener ranking:', error);
    return Response.json({ error: 'Error en el servidor.' }, { status: 500 });
  }
}
