'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, UserCheck, RefreshCw, Smartphone, Award, Trophy, Save, Trash2, ShieldAlert } from 'lucide-react';
import styles from './admin.module.css';

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

  const handleDeleteUser = async (dni) => {
    setError('');
    setSuccess('');
    if (!confirm('¿Estás seguro que deseas borrar a este usuario pendiente de aprobación?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users?dni=${dni}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar usuario.');

      setSuccess(`Usuario con DNI ${dni} eliminado correctamente.`);
      
      // Recargar lista de usuarios
      verifyAndLoad(adminToken);
    } catch (err) {
      setError(err.message || 'Error al eliminar.');
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
      <main className={styles.loginWrapper}>
        <div className={`card animate-fade-in ${styles.loginCard}`}>
          <div className={styles.loginHeader}>
            <ShieldAlert size={48} style={{ color: 'var(--accent)', marginBottom: '0.5rem' }} />
            <h1 className={styles.loginTitle}>Panel de Control</h1>
            <p className={styles.loginDesc}>Ingresá la clave de administrador para continuar.</p>
          </div>

          {error && (
            <div className={styles.loginError}>
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
    <div className={styles.adminContainer}>
      
      {/* Navbar de Admin */}
      <nav className={`navbar ${styles.navbarAdmin}`}>
        <div className="nav-brand">
          <ShieldCheck style={{ color: 'var(--danger)' }} />
          <img src="/chimipesca-logo.jpg" alt="Logo ChimiPesca" className="nav-logo" style={{ width: '40px', height: '40px' }} />
          <img src="/mundial-logo.jpg" alt="Logo Mundial 2026" className={`nav-logo ${styles.logoNavMundial}`} style={{ width: '40px', height: '40px' }} />
          <span className={`nav-title ${styles.navbarTitleAdmin} hide-mobile`}>
            Chimi Prode - ADMINISTRACIÓN
          </span>
        </div>
        <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: 'auto' }}>
          Cerrar Panel
        </button>
      </nav>

      {/* Cuerpo principal */}
      <main className={`container ${styles.mainContent}`}>
        
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
        <div className={styles.tabSelector}>
          <button
            onClick={() => { setActiveTab('payments'); setError(''); setSuccess(''); }}
            className={`${styles.tabButton} ${activeTab === 'payments' ? styles.tabButtonActive : ''}`}
          >
            <span className="hide-mobile">Aprobación de Pagos ({pendingUsers.length} pendientes)</span>
            <span className="show-mobile">Pagos ({pendingUsers.length})</span>
          </button>
          
          <button
            onClick={() => { setActiveTab('matches'); setError(''); setSuccess(''); }}
            className={`${styles.tabButton} ${activeTab === 'matches' ? styles.tabButtonActive : ''}`}
          >
            <span className="hide-mobile">Cargar Resultados de Partidos</span>
            <span className="show-mobile">Resultados</span>
          </button>
        </div>

        {/* Secciones de las Pestañas */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <RefreshCw className={`animate-spin ${styles.loadingSpinner}`} />
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Cargando datos del panel...</p>
          </div>
        ) : (
          <>
            {/* Pestaña: Aprobación de Pagos */}
            {activeTab === 'payments' && (
              <div className="animate-fade-in">
                
                {/* Resumen Estadístico */}
                <div className={styles.statsGrid}>
                  <div className={styles.statsCard}>
                    <span className={styles.statsTitle}>Total Participantes</span>
                    <h3 className={styles.statsValue}>{users.filter(u => u.rol !== 'admin').length}</h3>
                  </div>
                  <div className={styles.statsCardAproved}>
                    <span className={styles.statsTitle} style={{ color: 'var(--success)' }}>Aprobados (Pagos)</span>
                    <h3 className={styles.statsValue} style={{ color: 'var(--success)' }}>{approvedUsers.length}</h3>
                  </div>
                  <div className={styles.statsCardPending}>
                    <span className={styles.statsTitle} style={{ color: 'var(--accent)' }}>Pendientes</span>
                    <h3 className={styles.statsValue} style={{ color: 'var(--accent)' }}>{pendingUsers.length}</h3>
                  </div>
                </div>

                <div className={`card ${styles.leaderboardCard}`}>
                  <h3 className={styles.cardHeader}>Lista de Usuarios Registrados</h3>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                          <th className={styles.th}>DNI</th>
                          <th className={styles.th}>Participante</th>
                          <th className={styles.th}>Celular</th>
                          <th className={`${styles.th} hide-mobile`} style={{ textAlign: 'center' }}>Votos Cargados</th>
                          <th className={`${styles.th} show-mobile`} style={{ textAlign: 'center' }}>Votos</th>
                          <th className={styles.th} style={{ textAlign: 'center' }}>Estado Pago</th>
                          <th className={styles.th} style={{ textAlign: 'right' }}>Acciones</th>
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
                              <tr key={u.dni} className={styles.tr}>
                                <td className={styles.tdDni}>{u.dni}</td>
                                <td className={styles.td}>{u.nombre} <span className="hide-mobile">{u.apellido}</span></td>
                                <td className={styles.td}>
                                  <div className={styles.phoneWrapper}>
                                    <Smartphone size={14} style={{ color: 'var(--text-muted)' }} />
                                    <span>{u.celular}</span>
                                  </div>
                                </td>
                                <td className={styles.td} style={{ textAlign: 'center' }}>
                                  <span className={`${styles.badgePredictions} ${u.predicciones_cargadas > 0 ? styles.badgePredictionsActive : ''}`}>
                                    {u.predicciones_cargadas} <span className="hide-mobile">partidos</span>
                                  </span>
                                </td>
                                <td className={styles.td} style={{ textAlign: 'center' }}>
                                  <span className={`${styles.badgePayment} ${u.pago_aprobado === 1 ? styles.badgePaymentAproved : styles.badgePaymentPending}`}>
                                    {u.pago_aprobado === 1 ? 'Aprobado' : 'Pendiente'}
                                  </span>
                                </td>
                                <td className={styles.td} style={{ textAlign: 'right' }}>
                                  <div className={styles.actionsWrapper}>
                                    
                                    {/* Link WhatsApp */}
                                    <a
                                      href={getWhatsAppLink(u.celular, u.nombre)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`btn btn-outline ${styles.waBtn}`}
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

                                    {/* Botón Eliminar */}
                                    <button
                                      onClick={() => handleDeleteUser(u.dni)}
                                      className={`btn btn-outline ${styles.deleteBtn}`}
                                    >
                                      Eliminar
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
                <div className={`card ${styles.syncCard}`}>
                  <div className={styles.syncHeader}>
                    <div>
                      <h4 className={styles.syncTitle}>Sincronización de Resultados (API)</h4>
                      <p className={styles.syncDesc}>
                        Conectate a la API oficial del Mundial para traer los resultados de partidos ya finalizados y recalcular los puntos de todos los participantes.
                      </p>
                    </div>
                    <div className={styles.syncActions}>
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
                    <div className={styles.syncReport}>
                      <strong className={styles.syncReportTitle}>
                        Reporte de Sincronización:
                      </strong>
                      <p className={styles.syncReportText}>{syncResult.message}</p>
                      {syncResult.details && syncResult.details.length > 0 && (
                        <ul className={styles.syncReportList}>
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

                <div className={styles.adminMatchList}>
                  {matches.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay partidos disponibles.</p>
                  ) : (
                    matches.map((m) => {
                      const localMatch = localScores[m.id] || { goles_a: '', goles_b: '', estado: 'pendiente' };
                      const isPlayed = m.estado === 'jugado';

                      return (
                        <div key={m.id} className={`card ${styles.matchCard}`}>
                          
                          {/* Detalle fecha/grupo */}
                          <div className={styles.matchHeader}>
                            <span>{m.grupo_fase}</span>
                            <span>{new Date(m.fecha_hora).toLocaleDateString()}</span>
                          </div>

                          <div className={styles.matchBody}>
                            {/* Equipo A */}
                            <div className={styles.teamRowA}>
                              <span>{m.equipo_a}</span>
                            </div>

                            {/* Cargar Goles */}
                            <div className={styles.scoreControl}>
                              <div className={styles.scoreInputsRow}>
                                <input
                                  type="text"
                                  maxLength="2"
                                  className="score-input"
                                  style={{ width: '45px', height: '45px', borderColor: isPlayed ? 'var(--success)' : 'var(--border)' }}
                                  value={localMatch.goles_a}
                                  onChange={(e) => handleScoreChange(m.id, 'a', e.target.value)}
                                  placeholder="-"
                                />
                                <span className={styles.vsDivider}>VS</span>
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

                              <div className={styles.adminActionsRow}>
                                {/* Botón Guardar */}
                                <button
                                  onClick={() => handleSaveResult(m.id)}
                                  className="btn btn-accent"
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', width: 'auto', gap: '4px', height: 'auto' }}
                                >
                                  <Save size={12} />
                                  Guardar
                                </button>

                                {/* Botón Resetear si ya se jugó */}
                                {isPlayed && (
                                  <button
                                    onClick={() => handleResetMatch(m.id)}
                                    className="btn btn-outline"
                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', width: 'auto', gap: '4px', borderColor: 'var(--danger)', color: '#ff7a7a', height: 'auto' }}
                                  >
                                    <Trash2 size={12} />
                                    Resetear
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Equipo B */}
                            <div className={styles.teamRowB}>
                              <span>{m.equipo_b}</span>
                            </div>
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}
