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

  // Estados para creación de partidos
  const [newEquipoA, setNewEquipoA] = useState('');
  const [newEquipoB, setNewEquipoB] = useState('');
  const [newGrupoFase, setNewGrupoFase] = useState('16avos de Final');
  const [newFechaHora, setNewFechaHora] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Estados para restauración de backup
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Estados para edición de partidos
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editEquipoA, setEditEquipoA] = useState('');
  const [editEquipoB, setEditEquipoB] = useState('');
  const [editGrupoFase, setEditGrupoFase] = useState('');
  const [editFechaHora, setEditFechaHora] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const formatAdminMatchDate = (dateStr) => {
    if (!dateStr) return '';
    const d = (dateStr.includes('Z') || dateStr.match(/[\+\-]\d{2}:\d{2}$/))
      ? new Date(dateStr)
      : new Date(`${dateStr}-03:00`);
    const dateFormatted = d.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    const timeFormatted = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });
    return `${dateFormatted} ${timeFormatted} hs`;
  };

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

  const handleSaveEditDetails = async (e, matchId) => {
    e.preventDefault();
    if (!editEquipoA || !editEquipoB || !editFechaHora || !editGrupoFase) {
      setError('Por favor completa todos los campos.');
      return;
    }
    setEditLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          action: 'edit',
          matchId,
          equipoA: editEquipoA,
          equipoB: editEquipoB,
          grupoFase: editGrupoFase,
          fechaHora: editFechaHora
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar los detalles del partido.');

      setSuccess('Detalles del partido actualizados exitosamente.');
      setEditingMatchId(null);
      
      // Recargar partidos
      verifyAndLoad(adminToken);
    } catch (err) {
      setError(err.message || 'Error al guardar.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (!newEquipoA || !newEquipoB || !newFechaHora) {
      setError('Por favor completa todos los campos para crear el partido.');
      return;
    }
    setCreateLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          action: 'create',
          equipoA: newEquipoA,
          equipoB: newEquipoB,
          grupoFase: newGrupoFase,
          fechaHora: newFechaHora
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear el partido.');

      setSuccess(`Partido "${newEquipoA} vs ${newEquipoB}" creado correctamente.`);
      setNewEquipoA('');
      setNewEquipoB('');
      setNewFechaHora('');
      
      // Recargar partidos
      verifyAndLoad(adminToken);
    } catch (err) {
      setError(err.message || 'Error al crear partido.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRestoreBackup = async (e) => {
    e.preventDefault();
    if (!restoreFile) {
      setError('Por favor selecciona un archivo JSON de backup.');
      return;
    }

    if (!confirm('⚠️ ¿Estás absolutamente seguro de restaurar? Se borrarán todos los datos actuales de usuarios y partidos e insertarán los del archivo.')) {
      return;
    }

    setRestoreLoading(true);
    setError('');
    setSuccess('');

    try {
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        try {
          const backupJson = JSON.parse(event.target.result);
          
          const res = await fetch('/api/admin/backup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(backupJson)
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Error al restaurar.');

          setSuccess(`¡Base de datos restaurada! Se cargaron: ${data.stats.users} usuarios, ${data.stats.matches} partidos y ${data.stats.predictions} predicciones.`);
          setRestoreFile(null);
          document.getElementById('backup-upload-input').value = '';

          // Recargar todos los datos
          verifyAndLoad(adminToken);
        } catch (parseErr) {
          setError(`Error al leer el archivo JSON: ${parseErr.message}`);
          setRestoreLoading(false);
        }
      };
      
      fileReader.readAsText(restoreFile);
    } catch (err) {
      setError(err.message || 'Error al procesar el archivo.');
      setRestoreLoading(false);
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
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setActiveTab('payments'); setError(''); setSuccess(''); setSyncResult(null); }}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'payments' ? '3px solid var(--accent)' : '3px solid transparent',
              color: activeTab === 'payments' ? 'white' : 'var(--text-secondary)',
              padding: '1rem 0.5rem',
              fontSize: '1.1rem',
              fontWeight: '700',
              cursor: 'pointer',
              flex: 1,
              minWidth: '150px'
            }}
          >
            Aprobación de Pagos ({pendingUsers.length} pendientes)
          </button>
          
          <button
            onClick={() => { setActiveTab('matches'); setError(''); setSuccess(''); setSyncResult(null); }}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'matches' ? '3px solid var(--accent)' : '3px solid transparent',
              color: activeTab === 'matches' ? 'white' : 'var(--text-secondary)',
              padding: '1rem 0.5rem',
              fontSize: '1.1rem',
              fontWeight: '700',
              cursor: 'pointer',
              flex: 1,
              minWidth: '150px'
            }}
          >
            Cargar Resultados de Partidos
          </button>

          <button
            onClick={() => { setActiveTab('config'); setError(''); setSuccess(''); setSyncResult(null); }}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'config' ? '3px solid var(--accent)' : '3px solid transparent',
              color: activeTab === 'config' ? 'white' : 'var(--text-secondary)',
              padding: '1rem 0.5rem',
              fontSize: '1.1rem',
              fontWeight: '700',
              cursor: 'pointer',
              flex: 1,
              minWidth: '150px'
            }}
          >
            ⚙️ Respaldo y Configuración
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
                      const isEditing = editingMatchId === m.id;

                      if (isEditing) {
                        return (
                          <div key={m.id} className={`card ${styles.matchCard} animate-fade-in`} style={{ padding: '1.5rem', border: '2px solid var(--accent)' }}>
                            <h4 style={{ fontWeight: '800', marginBottom: '1rem', color: 'var(--accent)' }}>✏️ Editar Partido #{m.id}</h4>
                            <form onSubmit={(e) => handleSaveEditDetails(e, m.id)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Fase / Etapa</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ padding: '0.6rem 0.8rem', fontSize: '0.95rem' }}
                                  value={editGrupoFase}
                                  onChange={(e) => setEditGrupoFase(e.target.value)}
                                  required
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Fecha y Hora</label>
                                <input
                                  type="datetime-local"
                                  className="form-input"
                                  style={{ padding: '0.6rem 0.8rem', fontSize: '0.95rem' }}
                                  value={editFechaHora}
                                  onChange={(e) => setEditFechaHora(e.target.value)}
                                  required
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Equipo A (Local)</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ padding: '0.6rem 0.8rem', fontSize: '0.95rem' }}
                                  value={editEquipoA}
                                  onChange={(e) => setEditEquipoA(e.target.value)}
                                  required
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Equipo B (Visitante)</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ padding: '0.6rem 0.8rem', fontSize: '0.95rem' }}
                                  value={editEquipoB}
                                  onChange={(e) => setEditEquipoB(e.target.value)}
                                  required
                                />
                              </div>
                              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button type="submit" className="btn btn-accent" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', width: 'auto', height: 'auto' }} disabled={editLoading}>
                                  {editLoading ? 'Guardando...' : 'Guardar Detalles'}
                                </button>
                                <button type="button" onClick={() => setEditingMatchId(null)} className="btn btn-outline" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', width: 'auto', height: 'auto' }}>
                                  Cancelar
                                </button>
                              </div>
                            </form>
                          </div>
                        );
                      }

                      return (
                        <div key={m.id} className={`card ${styles.matchCard}`}>
                          
                          {/* Detalle fecha/grupo y botón Editar */}
                          <div className={styles.matchHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span>{m.grupo_fase}</span>
                              <span style={{ color: 'var(--text-muted)' }}>|</span>
                              <span>{formatAdminMatchDate(m.fecha_hora)}</span>
                            </div>
                            <button
                              onClick={() => {
                                setEditingMatchId(m.id);
                                setEditEquipoA(m.equipo_a);
                                setEditEquipoB(m.equipo_b);
                                setEditGrupoFase(m.grupo_fase);
                                setEditFechaHora(m.fecha_hora);
                              }}
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', height: 'auto' }}
                            >
                              ✏️ Editar Datos
                            </button>
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
  
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', justifyContent: 'center' }}>
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
            {/* Pestaña: Configuración y Respaldo */}
            {activeTab === 'config' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* Herramientas de Base de Datos (Backup y Restauración) */}
                <div className="card" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1rem', color: 'white' }}>💾 Copias de Seguridad y Respaldo</h3>
                  
                  <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
                    <ShieldAlert className="alert-icon" style={{ color: 'var(--accent)' }} />
                    <div>
                      <strong>¡Atención!</strong> La restauración de datos es una operación destructiva. Eliminará todos los usuarios, partidos y pronósticos actuales en la base de datos e importará los datos del archivo JSON seleccionado. Se recomienda descargar una copia de seguridad antes de cualquier cambio.
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
                    
                    {/* Descargar Backup */}
                    <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <h4 style={{ fontWeight: '700', fontSize: '1.1rem', color: 'white' }}>1. Descargar Respaldo</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Guarda una copia completa del prode (usuarios registrados, partidos creados y sus pronósticos cargados) en tu computadora en formato JSON.
                      </p>
                      <a
                        href={`/api/admin/backup?token=${adminToken}`}
                        download="backup-chimi-prode.json"
                        className="btn btn-accent"
                        style={{ padding: '0.85rem 1.5rem', width: 'auto', display: 'inline-flex', alignSelf: 'flex-start', textDecoration: 'none' }}
                      >
                        ⬇️ Descargar Backup JSON
                      </a>
                    </div>

                    <div style={{ borderLeft: '1px solid var(--border)', height: '150px' }} className="hide-mobile"></div>

                    {/* Restaurar Backup */}
                    <form onSubmit={handleRestoreBackup} style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <h4 style={{ fontWeight: '700', fontSize: '1.1rem', color: 'white' }}>2. Restaurar Respaldo</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Sube un archivo de respaldo JSON previamente descargado para sobreescribir la base de datos.
                      </p>
                      <div className="form-group">
                        <input
                          type="file"
                          id="backup-upload-input"
                          accept=".json"
                          className="form-input"
                          style={{ padding: '0.5rem 0.8rem', fontSize: '0.95rem' }}
                          onChange={(e) => setRestoreFile(e.target.files[0])}
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn btn-outline"
                        style={{ padding: '0.85rem 1.5rem', width: 'auto', display: 'inline-flex', alignSelf: 'flex-start', borderColor: 'var(--danger)', color: '#ff7a7a' }}
                        disabled={restoreLoading}
                      >
                        {restoreLoading ? 'Restaurando...' : '⚠️ Subir y Restaurar'}
                      </button>
                    </form>

                  </div>
                </div>

                {/* Crear Nuevo Partido */}
                <div className="card" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1rem', color: 'white' }}>⚽ Crear Nuevo Partido (Knockouts)</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                    Cargá un nuevo partido de forma manual. Este partido se mostrará inmediatamente en el prode de los usuarios para que puedan votar.
                  </p>

                  <form onSubmit={handleCreateMatch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-mobile">
                    
                    <div className="form-group">
                      <label className="form-label">Fase / Etapa</label>
                      <select
                        className="form-input"
                        value={newGrupoFase}
                        onChange={(e) => setNewGrupoFase(e.target.value)}
                        required
                      >
                        <option value="16avos de Final">16avos de Final</option>
                        <option value="Octavos de Final">Octavos de Final</option>
                        <option value="Cuartos de Final">Cuartos de Final</option>
                        <option value="Semifinal">Semifinal</option>
                        <option value="Tercer Puesto">Tercer Puesto</option>
                        <option value="Final">Final</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Fecha y Hora de Kickoff</label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={newFechaHora}
                        onChange={(e) => setNewFechaHora(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Equipo A (Local)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej. Argentina"
                        value={newEquipoA}
                        onChange={(e) => setNewEquipoA(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Equipo B (Visitante)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej. México"
                        value={newEquipoB}
                        onChange={(e) => setNewEquipoB(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <button
                        type="submit"
                        className="btn btn-accent"
                        style={{ padding: '0.85rem 2rem', width: 'auto', display: 'inline-flex' }}
                        disabled={createLoading}
                      >
                        {createLoading ? 'Creando...' : '⚽ Crear Partido'}
                      </button>
                    </div>

                  </form>
                </div>

              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}
