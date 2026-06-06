'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, LogIn, UserPlus, CreditCard, Phone, User, ShieldAlert } from 'lucide-react';
import styles from './page.module.css';

export default function AccessPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('register'); // 'register' o 'login'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Campos de Registro
  const [regNombre, setRegNombre] = useState('');
  const [regApellido, setRegApellido] = useState('');
  const [regDni, setRegDni] = useState('');
  const [regCelular, setRegCelular] = useState('');

  // Campos de Login
  const [loginDni, setLoginDni] = useState('');
  const [loginNombreCompleto, setLoginNombreCompleto] = useState('');

  // Verificar si ya tiene sesión iniciada al cargar
  useEffect(() => {
    const savedUser = localStorage.getItem('chimiUser');
    if (savedUser) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          dni: regDni,
          nombre: regNombre,
          apellido: regApellido,
          celular: regCelular,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al registrarse.');
      }

      setMessage({ type: 'success', text: '¡Registro exitoso! Iniciando sesión...' });

      // Guardar sesión y redirigir
      localStorage.setItem('chimiUser', JSON.stringify(data.user));
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          dni: loginDni,
          nombreCompleto: loginNombreCompleto,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'DNI o Nombre incorrectos.');
      }

      setMessage({ type: 'success', text: '¡Ingreso correcto! Redirigiendo...' });

      // Guardar sesión y redirigir
      localStorage.setItem('chimiUser', JSON.stringify(data.user));
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.mainPage}>

      {/* Decoración superior estética fútbol + pesca */}
      <div className={styles.topDecorator}></div>

      <div className={`container ${styles.pageContainer}`}>

        {/* Encabezado Principal */}
        <header className={styles.header}>
          <div className={styles.brandContainer}>
            <img
              src="/chimipesca-logo.jpg"
              alt="ChimiPesca Logo"
              className={styles.logoChimi}
            />
            <h1 className={styles.mainTitle}>
              Chimi Prode <span className={styles.titleAccent}>Mundial 2026</span>
            </h1>
            <img
              src="/mundial-logo.jpg"
              alt="Mundial 2026 Logo"
              className={styles.logoMundial}
            />
          </div>
          <p className={styles.subtitle}>
            El prode de la comunidad del canal <span className={styles.subtitleHighlight}>ChimiPesca</span>. ¡Pesca, fútbol y mucha pasión!
          </p>
        </header>

        {/* Banner de Pago / Datos Bancarios */}
        <section className={`card animate-fade-in ${styles.infoSection}`}>
          <div className={styles.infoTitleRow}>
            <CreditCard className={styles.infoIcon} />
            <h2 className={styles.infoTitle}>Instrucciones de Inscripción</h2>
          </div>
          <p className={styles.infoDesc}>
            Para participar del prode y competir en el ranking de premios, transferí el valor de la inscripción:
          </p>
          <div className={styles.paymentRow}>
            <div className={styles.paymentCol}>
              <span className={styles.paymentLabel}>Valor</span>
              <span className={styles.paymentValue}>$10.000 ARS</span>
            </div>
            <div className={`${styles.paymentDivider} hide-mobile`}></div>
            <div className={styles.paymentCol}>
              <span className={styles.paymentLabel}>Alias Mercado Pago</span>
              <span className={styles.paymentAlias}>chimipesca.mundial</span>
            </div>
          </div>
          <p className={styles.paymentFooter}>
            Una vez transferido, registrate abajo con tus datos. El administrador aprobará tu participación.
          </p>
        </section>

        {/* Caja de Formularios (Tab Switcher) */}
        <section className={`card animate-fade-in ${styles.formCard}`}>

          {/* Selector de Pestañas */}
          <div className={styles.tabsContainer}>
            <button
              onClick={() => { setActiveTab('register'); setMessage({ type: '', text: '' }); }}
              className={`${styles.tabButton} ${activeTab === 'register' ? styles.tabButtonActive : ''}`}
            >
              <UserPlus size={18} />
              <span className="hide-mobile">1. REGISTRARSE</span>
              <span className="show-mobile">REGISTRARSE</span>
            </button>
            <button
              onClick={() => { setActiveTab('login'); setMessage({ type: '', text: '' }); }}
              className={`${styles.tabButton} ${activeTab === 'login' ? styles.tabButtonActive : ''}`}
            >
              <LogIn size={18} />
              <span className="hide-mobile">2. YA ESTOY REGISTRADO</span>
              <span className="show-mobile">INGRESAR</span>
            </button>
          </div>

          {/* Mostrar Mensajes */}
          {message.text && (
            <div className={`${styles.messageBox} ${message.type === 'success' ? styles.messageBoxSuccess : styles.messageBoxDanger}`}>
              <span>{message.type === 'success' ? '🏆' : '⚠️'}</span>
              <span>{message.text}</span>
            </div>
          )}

          {/* Formulario de Registro */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister}>
              <div className={styles.gridMobile}>
                <div className="form-group">
                  <label className="form-label" htmlFor="nombre">
                    <User size={14} className={styles.iconInline} /> Nombre
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    className="form-input"
                    placeholder="Ej. Juan"
                    required
                    value={regNombre}
                    onChange={(e) => setRegNombre(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="apellido">Apellido</label>
                  <input
                    type="text"
                    id="apellido"
                    className="form-input"
                    placeholder="Ej. Pérez"
                    required
                    value={regApellido}
                    onChange={(e) => setRegApellido(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="dni">Número de DNI (Sin puntos)</label>
                <input
                  type="text"
                  id="dni"
                  className="form-input"
                  placeholder="Ej. 12345678"
                  required
                  value={regDni}
                  onChange={(e) => setRegDni(e.target.value.replace(/[^0-9]/g, ''))} // Solo números
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="celular">
                  <Phone size={14} className={styles.iconInline} /> Teléfono Celular (Para contactarte)
                </label>
                <input
                  type="tel"
                  id="celular"
                  className="form-input"
                  placeholder="Ej. 1198765432"
                  required
                  value={regCelular}
                  onChange={(e) => setRegCelular(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-accent mt-2" disabled={loading}>
                {loading ? 'Procesando...' : 'Registrarme y Empezar a Jugar'}
              </button>
            </form>
          )}

          {/* Formulario de Login */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label" htmlFor="login-dni">Número de DNI</label>
                <input
                  type="text"
                  id="login-dni"
                  className="form-input"
                  placeholder="Ej. 12345678"
                  required
                  value={loginDni}
                  onChange={(e) => setLoginDni(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-nombre">Nombre y Apellido Completo</label>
                <input
                  type="text"
                  id="login-nombre"
                  className="form-input"
                  placeholder="Ingresá tal cual te registraste (Ej. Juan Pérez)"
                  required
                  value={loginNombreCompleto}
                  onChange={(e) => setLoginNombreCompleto(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary mt-2" disabled={loading}>
                {loading ? 'Ingresando...' : 'Ingresar a mis Pronósticos'}
              </button>
            </form>
          )}

        </section>

      </div>
    </main>
  );
}
