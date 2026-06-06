import db from '@/lib/db';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'chimi2026';

function isAuthorized(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '').trim();
  return token === ADMIN_PASSWORD;
}

// Mapeador flexible de nombres de países (de API en inglés/español a nuestra base de datos)
function mapTeamName(apiName) {
  if (!apiName) return '';
  const normalized = apiName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (normalized.includes('arg')) return 'Argentina';
  if (normalized.includes('arab') || normalized.includes('saudi')) return 'Arabia Saudita';
  if (normalized.includes('alger') || normalized.includes('argel')) return 'Argelia';
  if (normalized.includes('mexic')) return 'México';
  if (normalized.includes('sudaf') || normalized.includes('south africa')) return 'Sudáfrica';
  if (normalized.includes('canad')) return 'Canadá';
  if (normalized.includes('bosnia')) return 'Bosnia';
  if (normalized.includes('ee') || normalized.includes('usa') || normalized.includes('unit')) return 'EE. UU.';
  if (normalized.includes('parag')) return 'Paraguay';
  if (normalized.includes('esp') || normalized.includes('spain')) return 'España';
  if (normalized.includes('cabo') || normalized.includes('cape')) return 'Cabo Verde';
  if (normalized.includes('bra') || normalized.includes('moroc') === false && normalized.startsWith('br')) return 'Brasil';
  if (normalized.includes('marr') || normalized.includes('moroc')) return 'Marruecos';
  if (normalized.includes('alem') || normalized.includes('germ')) return 'Alemania';
  if (normalized.includes('ecuad')) return 'Ecuador';
  if (normalized.includes('fran') || normalized.includes('french')) return 'Francia';
  if (normalized.includes('jap') || normalized.includes('japan')) return 'Japón';
  
  return apiName;
}

// Función para calcular puntos de un partido y retornar las sentencias SQL correspondientes
async function getPointsUpdateStatements(matchId, golesRealesA, golesRealesB) {
  const predictionsRes = await db.execute({
    sql: 'SELECT * FROM predictions WHERE match_id = ?',
    args: [matchId]
  });
  const predictions = predictionsRes.rows;

  const realWinner = golesRealesA > golesRealesB ? 'A' : (golesRealesB > golesRealesA ? 'B' : 'Draw');
  const statements = [];

  for (const pred of predictions) {
    const predGolesA = pred.goles_a;
    const predGolesB = pred.goles_b;
    let points = 0;

    const predWinner = predGolesA > predGolesB ? 'A' : (predGolesB > predGolesA ? 'B' : 'Draw');

    if (predGolesA === golesRealesA && predGolesB === golesRealesB) {
      points = 3; // Exacto
    } else if (realWinner === predWinner) {
      points = 1; // Solo Ganador/Empate
    } else {
      points = 0;
    }

    statements.push({
      sql: 'UPDATE predictions SET puntos_obtenidos = ? WHERE id = ?',
      args: [points, pred.id]
    });
  }

  return statements;
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const { simulate } = await request.json();
    const now = new Date().toISOString();

    if (simulate) {
      // --- MODO SIMULACIÓN ---
      // Buscar el primer partido que esté 'pendiente' en nuestra BD y simular que terminó
      const matchToSimulateRes = await db.execute("SELECT * FROM matches WHERE estado = 'pendiente' ORDER BY fecha_hora ASC LIMIT 1");
      const matchToSimulate = matchToSimulateRes.rows[0];
      
      if (!matchToSimulate) {
        return Response.json({ success: true, message: 'No hay partidos pendientes para simular.', updatedCount: 0 });
      }

      // Generar goles aleatorios de simulación (ej. 2 - 1)
      const simGolesA = Math.floor(Math.random() * 4); // 0 a 3 goles
      const simGolesB = Math.floor(Math.random() * 3); // 0 a 2 goles

      const statements = [];
      statements.push({
        sql: 'UPDATE matches SET goles_a = ?, goles_b = ?, estado = ? WHERE id = ?',
        args: [simGolesA, simGolesB, 'jugado', matchToSimulate.id]
      });

      const pointStatements = await getPointsUpdateStatements(matchToSimulate.id, simGolesA, simGolesB);
      statements.push(...pointStatements);

      await db.batch(statements, "write");

      return Response.json({
        success: true,
        message: `Simulación exitosa: Partido "${matchToSimulate.equipo_a} vs ${matchToSimulate.equipo_b}" actualizado a ${simGolesA}-${simGolesB}.`,
        updatedCount: 1,
        details: [`${matchToSimulate.equipo_a} ${simGolesA} - ${simGolesB} ${matchToSimulate.equipo_b}`]
      });
    }

    // --- MODO REAL (Sincronización con API externa) ---
    // Consultar API del Mundial 2026
    let apiMatches = [];
    try {
      const apiResponse = await fetch('https://worldcup26.ir/api/v1/matches', {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 60 } // caché de 1 minuto
      });
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        // Dependiendo del formato devuelto, obtenemos el listado de partidos
        apiMatches = data.matches || data.data || (Array.isArray(data) ? data : []);
      } else {
        throw new Error('La API respondió con error.');
      }
    } catch (apiError) {
      console.warn('Fallo al conectar con la API de fútbol, usando origen alternativo local/mock:', apiError.message);
      return Response.json({ 
        error: 'No se pudo conectar con la API del mundial. Por favor intenta más tarde o carga los resultados manualmente en el formulario.' 
      }, { status: 502 });
    }

    let updatedCount = 0;
    const details = [];

    // Obtener los partidos pendientes de nuestra base de datos para comparar
    const localPendientesRes = await db.execute("SELECT * FROM matches WHERE estado = 'pendiente'");
    const localPendientes = localPendientesRes.rows;
    
    if (localPendientes.length === 0) {
      return Response.json({ success: true, message: 'Todos los partidos locales ya están cerrados.', updatedCount: 0 });
    }

    const statements = [];

    for (const apiMatch of apiMatches) {
      // Formato estándar de API de fútbol:
      // apiMatch.home_team, apiMatch.away_team o similar
      const homeName = mapTeamName(apiMatch.home_team?.name || apiMatch.home_team || apiMatch.team_a);
      const awayName = mapTeamName(apiMatch.away_team?.name || apiMatch.away_team || apiMatch.team_b);
      
      // Buscar si este partido coincide con alguno de nuestros pendientes
      const matchedLocal = localPendientes.find(m => 
        (m.equipo_a === homeName && m.equipo_b === awayName) || 
        (m.equipo_a === awayName && m.equipo_b === homeName)
      );

      if (matchedLocal) {
        // Extraer goles y estado de la API
        const status = apiMatch.status?.toLowerCase() || '';
        const isFinished = status === 'completed' || status === 'finished' || apiMatch.finished === true || apiMatch.completed === true;
        
        const apiGolesA = apiMatch.home_team?.score ?? apiMatch.score_a ?? apiMatch.home_score;
        const apiGolesB = apiMatch.away_team?.score ?? apiMatch.score_b ?? apiMatch.away_score;

        if (isFinished && apiGolesA !== null && apiGolesB !== null) {
          const cleanGolesA = parseInt(apiGolesA, 10);
          const cleanGolesB = parseInt(apiGolesB, 10);

          // Actualizar partido local
          statements.push({
            sql: 'UPDATE matches SET goles_a = ?, goles_b = ?, estado = ? WHERE id = ?',
            args: [cleanGolesA, cleanGolesB, 'jugado', matchedLocal.id]
          });

          // Recalcular predicciones de este partido
          const pointStatements = await getPointsUpdateStatements(matchedLocal.id, cleanGolesA, cleanGolesB);
          statements.push(...pointStatements);

          updatedCount++;
          details.push(`${matchedLocal.equipo_a} ${cleanGolesA} - ${cleanGolesB} ${matchedLocal.equipo_b}`);
        }
      }
    }

    if (statements.length > 0) {
      await db.batch(statements, "write");
    }

    return Response.json({
      success: true,
      message: `Sincronización finalizada. Se actualizaron ${updatedCount} partidos.`,
      updatedCount,
      details
    });

  } catch (error) {
    console.error('Error en sync API:', error);
    return Response.json({ error: 'Error en el servidor al sincronizar.' }, { status: 500 });
  }
}
