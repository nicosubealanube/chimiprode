'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Calendar, CheckCircle2, Lock, Save, LogOut, Search, RefreshCw, AlertCircle } from 'lucide-react';

// Mapeo de banderas de países
const FLAGS = {
  'Argentina': '🇦🇷',
  'Arabia Saudita': '🇸🇦',
  'México': '🇲🇽',
  'Sudáfrica': '🇿🇦',
  'Canadá': '🇨🇦',
  'Bosnia': '🇧🇦',
  'EE. UU.': '🇺🇸',
  'Paraguay': '🇵🇾',
  'España': '🇪🇸',
  'Cabo Verde': '🇨🇻',
  'Brasil': '🇧🇷',
  'Marruecos': '🇲🇦',
  'Alemania': '🇩🇪',
  'Ecuador': '🇪🇨',
  'Francia': '🇫🇷',
  'Japón': '🇯🇵'
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('chimiUser');
      return savedUser ? JSON.parse(savedUser) : null;
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState('predictions'); // 'predictions' o 'leaderboard'
  const [matches, setMatches] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar datos de partidos y predicciones
  const fetchData = async (dni) => {
    setLoading(true);
    setError('');
    try {
      // 1. Obtener partidos y predicciones del usuario
      const resPreds = await fetch(`/api/predictions?dni=${dni}`);
      const dataPreds = await resPreds.json();
      if (!resPreds.ok) throw new Error(dataPreds.error || 'Error al obtener partidos.');

      // Estructurar las predicciones locales como estado modificable
      const initialMatches = dataPreds.matches.map(m => ({
        ...m,
        goles_pred_a: m.goles_prediccion_a !== null ? String(m.goles_prediccion_a) : '',
        goles_pred_b: m.goles_prediccion_b !== null ? String(m.goles_prediccion_b) : '',
      }));
      setMatches(initialMatches);

      // 2. Obtener ranking
      const resLeader = await fetch('/api/leaderboard');
      const dataLeader = await resLeader.json();
      if (!resLeader.ok) throw new Error(dataLeader.error || 'Error al obtener ranking.');
      setLeaderboard(dataLeader.leaderboard);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos de usuario al montar
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    Promise.resolve().then(() => {
      fetchData(user.dni);
    });
  }, [router, user]);

  const handleLogout = () => {
    localStorage.removeItem('chimiUser');
    router.push('/');
  };

  const handleScoreChange = (matchId, team, value) => {
    // Solo permitir números enteros positivos o vacío
    const cleanValue = value.replace(/[^0-9]/g, '');
    
    setMatches(prevMatches => 
      prevMatches.map(m => {
        if (m.id === matchId) {
          return {
            ...m,
            [team === 'a' ? 'goles_pred_a' : 'goles_pred_b']: cleanValue
          };
        }
        return m;
      })
    );
  };

  const handleSavePredictions = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');

    // Filtrar predicciones cargadas (ambos campos completos)
    const predictionsToSave = matches
      .filter(m => m.goles_pred_a !== '' && m.goles_pred_b !== '')
      .map(m => ({
        matchId: m.id,
        golesA: m.goles_pred_a,
        golesB: m.goles_pred_b
      }));

    if (predictionsToSave.length === 0) {
      setError('Por favor completa al menos un resultado para guardar.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dni: user.dni,
          predictions: predictionsToSave
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar.');

      setSuccess('¡Pronósticos guardados correctamente!');
      
      // Volver a cargar partidos para refrescar el estado guardado desde la base de datos
      await fetchData(user.dni);

      // Limpiar mensaje de éxito después de unos segundos
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Ocurrió un error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  // Filtrar el ranking según el término de búsqueda
  const filteredLeaderboard = leaderboard.filter(entry => {
    const fullName = `${entry.nombre} ${entry.apellido}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || entry.dni.includes(searchTerm);
  });

  // Verificar si un partido está cerrado (ya empezó)
  const isMatchClosed = (matchDateString) => {
    const now = new Date();
    const matchTime = new Date(matchDateString);
    return now >= matchTime;
  };

  // Formatear fecha legible
  const formatMatchDate = (dateString) => {
    const options = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
    const date = new Date(dateString);
    // Cambiar primer letra a mayúscula
    const formatted = date.toLocaleDateString('es-AR', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1) + ' hs';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      
      {/* Barra de Navegación */}
      <nav className="navbar">
        <div className="nav-brand">
          <img src="/chimipesca-logo.jpg" alt="Logo ChimiPesca" className="nav-logo" />
          <span className="nav-title hide-mobile">Chimi Prode 2026</span>
        </div>
        
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              👋 Hola, <span style={{ color: 'var(--accent)' }}>{user.nombre} {user.apellido}</span>
            </span>
            <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: 'var(--radius-sm)', width: 'auto' }}>
              <LogOut size={16} /> <span className="hide-mobile">Salir</span>
            </button>
          </div>
        )}
      </nav>

      {/* Contenido Principal */}
      <main className="container" style={{ flexGrow: 1, paddingTop: '1.5rem', paddingBottom: '5rem' }}>
        
        {/* Banner de alerta de pago pendiente */}
        {user && user.pago_aprobado === 0 && (
          <div className="alert alert-warning animate-fade-in">
            <AlertCircle className="alert-icon" style={{ color: 'var(--accent)' }} />
            <div>
              <strong>¡Inscripción pendiente de aprobación!</strong> Puedes cargar tus pronósticos ahora mismo para no perder tiempo, pero no aparecerás en la tabla de posiciones ni sumarán tus puntos hasta que el administrador apruebe tu transferencia al alias <strong>lodechimipesca</strong>.
            </div>
          </div>
        )}

        {user && user.pago_aprobado === 1 && (
          <div className="alert alert-success animate-fade-in">
            <CheckCircle2 className="alert-icon" style={{ color: 'var(--success)' }} />
            <div>
              <strong>¡Inscripción aprobada!</strong> Tu participación está confirmada. Ya formas parte de la competencia oficial del prode. ¡Mucha suerte!
            </div>
          </div>
        )}

        {/* Notificaciones de Éxito / Error de guardado */}
        {error && (
          <div className="alert animate-fade-in" style={{ background: 'rgba(231, 76, 60, 0.15)', borderColor: 'var(--danger)', color: '#ff9c9c' }}>
            <AlertCircle className="alert-icon" />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="alert animate-fade-in" style={{ background: 'rgba(19, 184, 96, 0.15)', borderColor: 'var(--success)', color: '#a3f3c8' }}>
            <CheckCircle2 className="alert-icon" />
            <div>{success}</div>
          </div>
        )}

        {/* Tab Selector */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          marginBottom: '2rem',
          gap: '1rem'
        }}>
          <button
            onClick={() => setActiveTab('predictions')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'predictions' ? '3px solid var(--accent)' : '3px solid transparent',
              color: activeTab === 'predictions' ? 'white' : 'var(--text-secondary)',
              padding: '1rem 0.5rem',
              fontSize: '1.2rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'var(--transition)',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <Calendar size={20} />
            Mis Pronósticos
          </button>
          
          <button
            onClick={() => {
              setActiveTab('leaderboard');
              if (user) fetchData(user.dni); // Recargar datos
            }}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'leaderboard' ? '3px solid var(--accent)' : '3px solid transparent',
              color: activeTab === 'leaderboard' ? 'white' : 'var(--text-secondary)',
              padding: '1rem 0.5rem',
              fontSize: '1.2rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'var(--transition)',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <Trophy size={20} />
            Tabla de Posiciones
          </button>
        </div>

        {/* Carga del Dashboard */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <RefreshCw className="animate-spin" style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} size={40} />
            <p style={{ color: 'var(--text-secondary)' }}>Cargando datos del Prode...</p>
          </div>
        ) : (
          <>
            {/* Pestaña: Mis Pronósticos */}
            {activeTab === 'predictions' && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    Ingresá tus resultados estimados. Podés editarlos las veces que quieras hasta que comience cada partido.
                  </p>
                </div>

                {/* Lista de Partidos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '3rem' }}>
                  {matches.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No hay partidos cargados actualmente.</p>
                  ) : (
                    matches.map((match) => {
                      const closed = isMatchClosed(match.fecha_hora) || match.estado === 'jugado';

                      return (
                        <div key={match.id} className={`match-card ${closed ? 'locked' : ''}`}>
                          
                          {/* Cabecera del Partido */}
                          <div className="match-info-header">
                            <span>{match.grupo_fase}</span>
                            <span>{formatMatchDate(match.fecha_hora)}</span>
                          </div>

                          {/* Equipo A */}
                          <div className="match-team team-a">
                            <span>{match.equipo_a}</span>
                            <span className="match-flag">{FLAGS[match.equipo_a] || '🏳️'}</span>
                          </div>

                          {/* Inputs de Predicción */}
                          <div className="match-vs">
                            <div className="match-score-inputs">
                              <input
                                type="text"
                                maxLength="2"
                                inputMode="numeric"
                                className="score-input"
                                value={match.goles_pred_a}
                                onChange={(e) => handleScoreChange(match.id, 'a', e.target.value)}
                                disabled={closed}
                                placeholder="-"
                              />
                              <span style={{ fontWeight: '800', color: 'var(--text-muted)' }}>VS</span>
                              <input
                                type="text"
                                maxLength="2"
                                inputMode="numeric"
                                className="score-input"
                                value={match.goles_pred_b}
                                onChange={(e) => handleScoreChange(match.id, 'b', e.target.value)}
                                disabled={closed}
                                placeholder="-"
                              />
                            </div>
                            
                            {/* Estado y Candados */}
                            {closed ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--accent)', marginTop: '4px', fontWeight: '600' }}>
                                <Lock size={12} />
                                Cerrado
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '4px', fontWeight: '500' }}>
                                Abierto para votar
                              </div>
                            )}
                          </div>

                          {/* Equipo B */}
                          <div className="match-team team-b">
                            <span className="match-flag">{FLAGS[match.equipo_b] || '🏳️'}</span>
                            <span>{match.equipo_b}</span>
                          </div>

                          {/* Resultados Reales y Puntuación Obtenida */}
                          {match.estado === 'jugado' && match.goles_reales_a !== null && (
                            <div style={{
                              gridColumn: 'span 3',
                              marginTop: '0.75rem',
                              paddingTop: '0.75rem',
                              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                                Resultado Real: <strong style={{ color: 'white' }}>{match.goles_reales_a} - {match.goles_reales_b}</strong>
                              </span>
                              
                              {match.puntos_obtenidos !== null && (
                                <span className={`points-badge ${
                                  match.puntos_obtenidos === 3 ? 'points-exact' : 
                                  match.puntos_obtenidos === 1 ? 'points-outcome' : 'points-zero'
                                }`}>
                                  {match.puntos_obtenidos === 3 ? '+3 PTS (Exacto)' : 
                                   match.puntos_obtenidos === 1 ? '+1 PTS (Acierto)' : '0 PTS'}
                                </span>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>

                {/* Botón flotante para guardar predicciones */}
                <div style={{
                  position: 'fixed',
                  bottom: '2rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 'calc(100% - 3rem)',
                  maxWidth: '500px',
                  zIndex: 90
                }}>
                  <button
                    onClick={handleSavePredictions}
                    className="btn btn-accent"
                    style={{ fontSize: '1.2rem', gap: '0.75rem', height: '3.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}
                    disabled={saving}
                  >
                    <Save size={22} />
                    {saving ? 'Guardando...' : 'GUARDAR MIS PRONÓSTICOS'}
                  </button>
                </div>
              </div>
            )}

            {/* Pestaña: Tabla de Posiciones */}
            {activeTab === 'leaderboard' && (
              <div className="card animate-fade-in" style={{ padding: '1.5rem' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Competencia Oficial</h2>
                  
                  {/* Buscador de Participante */}
                  <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Buscar participante..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ paddingLeft: '2.5rem', fontSize: '0.95rem' }}
                    />
                  </div>
                </div>

                {/* Tabla de Ranking */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', fontWeight: '600' }}>Puesto</th>
                        <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', fontWeight: '600' }}>Participante</th>
                        <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'center' }}>Plenos (3 pts)</th>
                        <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'center' }}>Aciertos (1 pt)</th>
                        <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'right' }}>Total Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeaderboard.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            {searchTerm ? 'No se encontraron resultados.' : 'Aún no hay participantes registrados y aprobados para mostrar.'}
                          </td>
                        </tr>
                      ) : (
                        filteredLeaderboard.map((entry, index) => {
                          const isCurrentUser = user && entry.dni === user.dni;
                          
                          return (
                            <tr
                              key={entry.dni}
                              style={{
                                borderBottom: '1px solid var(--border)',
                                background: isCurrentUser ? 'rgba(245, 130, 32, 0.08)' : 'transparent',
                                fontWeight: isCurrentUser ? '700' : '400',
                                color: isCurrentUser ? 'var(--accent)' : 'white'
                              }}
                            >
                              <td style={{ padding: '1rem 0.5rem' }}>
                                {index + 1 === 1 ? '🥇' : index + 1 === 2 ? '🥈' : index + 1 === 3 ? '🥉' : `#${index + 1}`}
                              </td>
                              <td style={{ padding: '1rem 0.5rem' }}>
                                {entry.nombre} {entry.apellido} {isCurrentUser && ' (Vos)'}
                              </td>
                              <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: 'var(--success)' }}>
                                {entry.exactos}
                              </td>
                              <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: '#4dc2db' }}>
                                {entry.aciertos}
                              </td>
                              <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: '800', fontSize: '1.15rem' }}>
                                {entry.puntos_totales} pts
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Reglamento de Puntos:</h4>
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li><strong>Resultado Exacto (3 Puntos)</strong>: Acertar goles de ambos equipos exactamente (ej. pronóstico 2-1 y real 2-1).</li>
                    <li><strong>Resultado Solo (1 Punto)</strong>: Acertar el ganador o empate sin el resultado exacto (ej. pronóstico 2-1 y real 1-0; o pronóstico 1-1 y real 2-2).</li>
                    <li><strong>Desempate</strong>: En caso de empate en puntos totales, el ranking se ordena por el participante que tenga mayor cantidad de resultados exactos (plenos).</li>
                  </ul>
                </div>

              </div>
            )}
          </>
        )}

      </main>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @media (max-width: 600px) {
          .hide-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
