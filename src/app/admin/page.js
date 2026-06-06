'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, UserCheck, RefreshCw, Smartphone, Award, Trophy, Save, Trash2, ShieldAlert } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [adminToken, setAdminToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('chimiAdminToken') || '';
    }
    return '';
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' o 'matches'
  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Estados para cargar resultados
  const [localScores, setLocalScores] = useState({});

  const verifyAndLoad = async (token) => {
    setLoading(true);
    setError('');
    try {
      // Intentar llamar a la API de admin con el token
      const resUsers = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataUsers = await resUsers.json();

      if (!resUsers.ok) {
        throw new Error(dataUsers.error || 'Clave incorrecta.');
      }

      setUsers(dataUsers.users);
      setIsAuthenticated(true);
      sessionStorage.setItem('chimiAdminToken', token);

      // Cargar también partidos
      const resMatches = await fetch('/api/admin/matches', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataMatches = await resMatches.json();
      if (resMatches.ok) {
        setMatches(dataMatches.matches);
        // Inicializar scores locales
        const scores = {};
        dataMatches.matches.forEach(m => {
          scores[m.id] = {
            goles_a: m.goles_a !== null ? String(m.goles_a) : '',
            goles_b: m.goles_b !== null ? String(m.goles_b) : '',
            estado: m.estado
          };
        });
        setLocalScores(scores);
      }

    } catch (err) {
      console.error(err);
      setError(err.message || 'Error de conexión.');
      setIsAuthenticated(false);
      sessionStorage.removeItem('chimiAdminToken');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      Promise.resolve().then(() => {
        verifyAndLoad(adminToken);
      });
    }
  }, [adminToken]);

  const handleLogin = (e) => {
    e.preventDefault();
    setAdminToken(passwordInput);
    verifyAndLoad(passwordInput);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('chimiAdminToken');
    setIsAuthenticated(false);
    setAdminToken('');
    setPasswordInput('');
  };

  const handleTogglePayment = async (dni, currentStatus) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ dni, pago_aprobado: !currentStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar pago.');

      setSuccess(`Usuario con DNI ${dni} actualizado correctamente.`);
      
      // Recargar lista de usuarios
      verifyAndLoad(adminToken);
    } catch (err) {
      setError(err.message || 'Error al actualizar.');
    }
  };

  const handleScoreChange = (matchId, team, value) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    setLocalScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team === 'a' ? 'goles_a' : 'goles_b']: cleanValue
      }
    }));
  };

  const handleSaveResult = async (matchId) => {
    setError('');
    setSuccess('');
    const matchData = localScores[matchId];

    if (matchData.goles_a === '' || matchData.goles_b === '') {
      setError('Debes ingresar los goles de ambos equipos para guardar el resultado.');
      return;
    }

    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          matchId,
          golesA: matchData.goles_a,
          golesB: matchData.goles_b,
          estado: 'jugado'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar resultado.');

      setSuccess('Resultado guardado y puntajes recalculados.');
      verifyAndLoad(adminToken);
    } catch (err) {
      setError(err.message || 'Error al guardar.');
    }
  };

  const handleResetMatch = async (matchId) => {
    setError('');
    setSuccess('');
    if (!confirm('¿Estás seguro de volver este partido a PENDIENTE? Se borrarán los puntajes otorgados.')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          matchId,
          golesA: null,
          golesB: null,
          estado: 'pendiente'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al resetear partido.');

      setSuccess('El partido volvió a estar pendiente. Los puntajes fueron reseteados.');
      verifyAndLoad(adminToken);
    } catch (err) {
      setError(err.message || 'Error al resetear.');
    }
  };

  const handleSync = async (simulate = false) => {
    setSyncLoading(true);
    setError('');
    setSuccess('');
    setSyncResult(null);

    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ simulate })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al sincronizar.');

      setSyncResult(data);
      setSuccess(data.message);
      
      // Recargar partidos y usuarios
      verifyAndLoad(adminToken);
    } catch (err) {
      setError(err.message || 'Error de sincronización.');
    } finally {
      setSyncLoading(false);
    }
  };

  // Generar link de WhatsApp
  const getWhatsAppLink = (celular, nombre) => {
    // Normalizar número eliminando caracteres no numéricos
    const cleanNum = celular.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`Hola ${nombre}! Te escribo de Chimi Prode. Vimos tu registro, recordá enviarnos el comprobante de transferencia para activar tu usuario en el prode.`);
    return `https://wa.me/${cleanNum.startsWith('54') ? cleanNum : '549' + cleanNum}?text=${message}`;
  };

  // Contadores rápidos para la sección de pagos
  const pendingUsers = users.filter(u => u.pago_aprobado === 0 && u.rol !== 'admin');
  const approvedUsers = users.filter(u => u.pago_aprobado === 1 && u.rol !== 'admin');

  // Si no está autenticado, mostrar formulario de login admin
  if (!isAuthenticated) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', padding: '1.5rem' }}>
        <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <ShieldAlert size={48} style={{ color: 'var(--accent)', marginBottom: '0.5rem' }} />
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800' }}>Panel de Control</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Ingresá la clave de administrador para continuar.</p>
          </div>

          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(231, 76, 60, 0.15)', border: '1px solid var(--danger)', color: '#ff9c9c', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.95rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Clave de Administrador</label>
              <input
                type="password"
                className="form-input"
                placeholder="Ingresá la clave (Ej. chimi2026)"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-accent" disabled={loading}>
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      
      {/* Navbar de Admin */}
      <nav className="navbar" style={{ background: '#0e0505', borderBottom: '1px solid rgba(231, 76, 60, 0.2)' }}>
        <div className="nav-brand">
          <ShieldCheck style={{ color: 'var(--danger)' }} />
          <span className="nav-title" style={{ background: 'linear-gradient(to right, #ff7a7a, var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Chimi Prode - ADMINISTRACIÓN
          </span>
        </div>
        <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: 'auto' }}>
          Cerrar Panel
        </button>
      </nav>

      {/* Cuerpo principal */}
      <main className="container" style={{ flexGrow: 1, paddingTop: '1.5rem', paddingBottom: '5rem' }}>
        
        {/* Avisos */}
        {error && (
          <div className="alert animate-fade-in" style={{ background: 'rgba(231, 76, 60, 0.15)', borderColor: 'var(--danger)', color: '#ff9c9c' }}>
            <ShieldAlert className="alert-icon" />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="alert alert-success animate-fade-in">
            <UserCheck className="alert-icon" />
            <div>{success}</div>
          </div>
        )}

        {/* Tab Selector */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '2rem', gap: '1rem' }}>
          <button
            onClick={() => { setActiveTab('payments'); setError(''); setSuccess(''); }}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'payments' ? '3px solid var(--accent)' : '3px solid transparent',
              color: activeTab === 'payments' ? 'white' : 'var(--text-secondary)',
              padding: '1rem 0.5rem',
              fontSize: '1.1rem',
              fontWeight: '700',
              cursor: 'pointer',
              flex: 1
            }}
          >
            Aprobación de Pagos ({pendingUsers.length} pendientes)
          </button>
          
          <button
            onClick={() => { setActiveTab('matches'); setError(''); setSuccess(''); }}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'matches' ? '3px solid var(--accent)' : '3px solid transparent',
              color: activeTab === 'matches' ? 'white' : 'var(--text-secondary)',
              padding: '1rem 0.5rem',
              fontSize: '1.1rem',
              fontWeight: '700',
              cursor: 'pointer',
              flex: 1
            }}
          >
            Cargar Resultados de Partidos
          </button>
        </div>

        {/* Secciones de las Pestañas */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <RefreshCw className="animate-spin" style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Cargando datos del panel...</p>
          </div>
        ) : (
          <>
            {/* Pestaña: Aprobación de Pagos */}
            {activeTab === 'payments' && (
              <div className="animate-fade-in">
                
                {/* Resumen Estadístico */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  <div className="card" style={{ padding: '1.25rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>TOTAL PARTICIPANTES</span>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.25rem' }}>{users.filter(u => u.rol !== 'admin').length}</h3>
                  </div>
                  <div className="card" style={{ padding: '1.25rem', textAlign: 'center', background: 'rgba(19, 184, 96, 0.05)', borderColor: 'rgba(19,184,96,0.2)' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--success)' }}>APROBADOS (PAGOS)</span>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--success)' }}>{approvedUsers.length}</h3>
                  </div>
                  <div className="card" style={{ padding: '1.25rem', textAlign: 'center', background: 'rgba(245, 130, 32, 0.05)', borderColor: 'rgba(245,130,32,0.2)' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--accent)' }}>PENDIENTES</span>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--accent)' }}>{pendingUsers.length}</h3>
                  </div>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '1.25rem' }}>Lista de Usuarios Registrados</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>DNI</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Participante</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Celular</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>Votos Cargados</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>Estado Pago</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(u => u.rol !== 'admin').length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aún no hay ningún usuario registrado.</td>
                          </tr>
                        ) : (
                          users
                            .filter(u => u.rol !== 'admin')
                            .map((u) => (
                              <tr key={u.dni} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '0.75rem', fontWeight: '600' }}>{u.dni}</td>
                                <td style={{ padding: '0.75rem' }}>{u.nombre} {u.apellido}</td>
                                <td style={{ padding: '0.75rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Smartphone size={14} style={{ color: 'var(--text-muted)' }} />
                                    <span>{u.celular}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '10px',
                                    fontSize: '0.8rem',
                                    background: u.predicciones_cargadas > 0 ? 'rgba(19, 184, 96, 0.15)' : 'rgba(255,255,255,0.05)',
                                    color: u.predicciones_cargadas > 0 ? 'var(--success)' : 'var(--text-muted)'
                                  }}>
                                    {u.predicciones_cargadas} partidos
                                  </span>
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '0.3rem 0.6rem',
                                    borderRadius: '20px',
                                    fontSize: '0.85rem',
                                    fontWeight: '700',
                                    background: u.pago_aprobado === 1 ? 'rgba(19, 184, 96, 0.15)' : 'rgba(245, 130, 32, 0.15)',
                                    color: u.pago_aprobado === 1 ? 'var(--success)' : 'var(--accent)',
                                    border: `1px solid ${u.pago_aprobado === 1 ? 'var(--success)' : 'var(--accent)'}`
                                  }}>
                                    {u.pago_aprobado === 1 ? 'Aprobado' : 'Pendiente'}
                                  </span>
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    
                                    {/* Link WhatsApp */}
                                    <a
                                      href={getWhatsAppLink(u.celular, u.nombre)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-outline"
                                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto', gap: '4px', color: '#25D366', borderColor: 'rgba(37, 211, 102, 0.2)' }}
                                    >
                                      WhatsApp
                                    </a>

                                    {/* Botón Aprobar / Desaprobar */}
                                    <button
                                      onClick={() => handleTogglePayment(u.dni, u.pago_aprobado)}
                                      className={`btn ${u.pago_aprobado === 1 ? 'btn-outline' : 'btn-primary'}`}
                                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto', height: 'auto' }}
                                    >
                                      {u.pago_aprobado === 1 ? 'Desaprobar' : 'Aprobar Pago'}
                                    </button>

                                  </div>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* Pestaña: Cargar Resultados */}
            {activeTab === 'matches' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Panel de Sincronización Automática */}
                <div className="card" style={{ padding: '1.5rem', background: 'rgba(16, 124, 145, 0.05)', borderColor: 'rgba(16, 124, 145, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white' }}>Sincronización de Resultados (API)</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        Conectate a la API oficial del Mundial para traer los resultados de partidos ya finalizados y recalcular los puntos de todos los participantes.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleSync(false)}
                        className="btn btn-primary"
                        style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', width: 'auto', gap: '6px' }}
                        disabled={syncLoading}
                      >
                        {syncLoading ? 'Sincronizando...' : '🔄 Sincronizar API Real'}
                      </button>
                      <button
                        onClick={() => handleSync(true)}
                        className="btn btn-outline"
                        style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', width: 'auto', gap: '6px', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                        disabled={syncLoading}
                      >
                        🧪 Simular Fin de Partido (Test)
                      </button>
                    </div>
                  </div>

                  {syncResult && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem', color: 'var(--success)' }}>
                        Reporte de Sincronización:
                      </strong>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{syncResult.message}</p>
                      {syncResult.details && syncResult.details.length > 0 && (
                        <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                          {syncResult.details.map((detail, idx) => (
                            <li key={idx}>{detail}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                  O ingresá los resultados reales de forma manual a continuación. Al guardar, se recalcularán los puntos de todos los usuarios de forma instantánea.
                </p>

                {matches.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay partidos disponibles.</p>
                ) : (
                  matches.map((m) => {
                    const localMatch = localScores[m.id] || { goles_a: '', goles_b: '', estado: 'pendiente' };
                    const isPlayed = m.estado === 'jugado';

                    return (
                      <div key={m.id} className="card" style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1.5fr auto 1.5fr', alignItems: 'center', gap: '1rem' }}>
                        
                        {/* Detalle fecha/grupo */}
                        <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
                          <span>{m.grupo_fase}</span>
                          <span>{new Date(m.fecha_hora).toLocaleDateString()}</span>
                        </div>

                        {/* Equipo A */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', fontWeight: '700' }}>
                          <span>{m.equipo_a}</span>
                        </div>

                        {/* Cargar Goles */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="text"
                              maxLength="2"
                              className="score-input"
                              style={{ width: '45px', height: '45px', borderColor: isPlayed ? 'var(--success)' : 'var(--border)' }}
                              value={localMatch.goles_a}
                              onChange={(e) => handleScoreChange(m.id, 'a', e.target.value)}
                              placeholder="-"
                            />
                            <span style={{ fontWeight: '800', color: 'var(--text-muted)' }}>VS</span>
                            <input
                              type="text"
                              maxLength="2"
                              className="score-input"
                              style={{ width: '45px', height: '45px', borderColor: isPlayed ? 'var(--success)' : 'var(--border)' }}
                              value={localMatch.goles_b}
                              onChange={(e) => handleScoreChange(m.id, 'b', e.target.value)}
                              placeholder="-"
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                            {/* Botón Guardar */}
                            <button
                              onClick={() => handleSaveResult(m.id)}
                              className="btn btn-accent"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', width: 'auto', gap: '4px' }}
                            >
                              <Save size={12} />
                              Guardar
                            </button>

                            {/* Botón Resetear si ya se jugó */}
                            {isPlayed && (
                              <button
                                onClick={() => handleResetMatch(m.id)}
                                className="btn btn-outline"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', width: 'auto', gap: '4px', borderColor: 'var(--danger)', color: '#ff7a7a' }}
                              >
                                <Trash2 size={12} />
                                Resetear
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Equipo B */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start', fontWeight: '700' }}>
                          <span>{m.equipo_b}</span>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}
