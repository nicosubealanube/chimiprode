'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, LogIn, UserPlus, CreditCard, Phone, User, ShieldAlert } from 'lucide-react';

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
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: '3rem' }}>
      
      {/* Decoración superior estética fútbol + pesca */}
      <div style={{
        background: 'linear-gradient(90deg, #107c91 0%, #13b860 50%, #f58220 100%)',
        height: '6px',
        width: '100%'
      }}></div>

      <div className="container" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: '1rem' }}>
        
        {/* Encabezado Principal */}
        <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.2rem', marginBottom: '0.8rem' }}>
            <img 
              src="/chimipesca-logo.jpg" 
              alt="ChimiPesca Logo" 
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                border: '3px solid var(--accent)',
                boxShadow: '0 0 20px var(--accent-glow)',
                objectFit: 'cover'
              }}
            />
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              lineHeight: '1.1',
              textAlign: 'left',
              maxWidth: '350px',
              background: 'linear-gradient(to right, #fff, #b7e3ed)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)'
            }}>
              Chimi Prode <span style={{ color: 'var(--accent)' }}>Mundial 2026</span>
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: '400', maxWidth: '500px', margin: '0 auto' }}>
            El prode de la comunidad del canal <span style={{ color: 'var(--success)', fontWeight: '600' }}>ChimiPesca</span>. ¡Pesca, fútbol y mucha pasión!
          </p>
        </header>

        {/* Banner de Pago / Datos Bancarios */}
        <section className="card animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '5px solid var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <CreditCard style={{ color: 'var(--accent)', width: '32px', height: '32px' }} />
            <h2 style={{ fontSize: '1.3rem', fontWeight: '700', color: 'white' }}>Instrucciones de Inscripción</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '0.75rem' }}>
            Para participar del prode y competir en el ranking de premios, transferí el valor de la inscripción:
          </p>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'rgba(0,0,0,0.25)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            justifyContent: 'space-around',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Valor</span>
              <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--success)' }}>$5.000 ARS</span>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', height: '40px' }} className="hide-mobile"></div>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Alias Mercado Pago</span>
              <span style={{ fontSize: '1.3rem', fontWeight: '800', color: 'white', letterSpacing: '0.05em' }}>lodechimipesca</span>
            </div>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center', fontStyle: 'italic' }}>
            Una vez transferido, registrate abajo con tus datos. El administrador aprobará tu participación.
          </p>
        </section>

        {/* Caja de Formularios (Tab Switcher) */}
        <section className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          
          {/* Selector de Pestañas */}
          <div style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.4rem',
            marginBottom: '2rem'
          }}>
            <button
              onClick={() => { setActiveTab('register'); setMessage({ type: '', text: '' }); }}
              style={{
                flex: 1,
                padding: '0.8rem',
                border: 'none',
                borderRadius: 'calc(var(--radius-md) - 4px)',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '1.05rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'var(--transition)',
                background: activeTab === 'register' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'register' ? 'white' : 'var(--text-secondary)'
              }}
            >
              <UserPlus size={18} />
              1. REGISTRARSE
            </button>
            <button
              onClick={() => { setActiveTab('login'); setMessage({ type: '', text: '' }); }}
              style={{
                flex: 1,
                padding: '0.8rem',
                border: 'none',
                borderRadius: 'calc(var(--radius-md) - 4px)',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '1.05rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'var(--transition)',
                background: activeTab === 'login' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'login' ? 'white' : 'var(--text-secondary)'
              }}
            >
              <LogIn size={18} />
              2. YA ESTOY REGISTRADO
            </button>
          </div>

          {/* Mostrar Mensajes */}
          {message.text && (
            <div style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              fontWeight: '500',
              fontSize: '1.05rem',
              background: message.type === 'success' ? 'rgba(19, 184, 96, 0.15)' : 'rgba(231, 76, 60, 0.15)',
              border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
              color: message.type === 'success' ? '#a3f3c8' : '#ff9c9c',
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem'
            }}>
              <span>{message.type === 'success' ? '🏆' : '⚠️'}</span>
              <span>{message.text}</span>
            </div>
          )}

          {/* Formulario de Registro */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-mobile">
                <div className="form-group">
                  <label className="form-label" htmlFor="nombre">
                    <User size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Nombre
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
                  <Phone size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Teléfono Celular (Para contactarte)
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

      <style jsx>{`
        .grid-mobile {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .hide-mobile {
          display: block;
        }
        @media (max-width: 600px) {
          .grid-mobile {
            grid-template-columns: 1fr;
            gap: 0;
          }
          .hide-mobile {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
