import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

type Step = 'choose' | 'outlet' | 'admin';

export default function Login() {
  const [step, setStep] = useState<Step>('choose');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginOutlet, loginAdmin, session } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      if (session.type === 'admin') navigate('/admin/dashboard', { replace: true });
      else navigate('/outlet/pos', { replace: true });
    }
  }, [session, navigate]);

  const reset = () => { setStep('choose'); setUsername(''); setPassword(''); setError(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (step === 'outlet') {
        await loginOutlet(username, password);
        navigate('/outlet/pos', { replace: true });
      } else {
        await loginAdmin(username, password);
        navigate('/admin/dashboard', { replace: true });
      }
    } catch {
      setError('Incorrect username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F7F5F2' }}>
      <div className="w-80">
        <div className="rounded-2xl overflow-hidden shadow-2xl">

          {/* Header — logo + brand name */}
          <div className="bg-[#F7F5F2] px-8 py-6 flex flex-col items-center gap-2">
            <img src="/logo.png" alt="The Highlander's Shawarma" className="h-28 w-auto object-contain" />
            <span className="text-xs font-bold tracking-[0.15em] text-gray-500 uppercase text-center">
              The Highlander's Shawarma
            </span>
          </div>

          {/* Body */}
          <div className="bg-white px-8 py-8">
            <p className="text-center text-sm font-bold tracking-[0.25em] text-gray-500 uppercase mb-8">
              Login
            </p>

            {step === 'choose' ? (
              <div className="flex gap-4">
                <button
                  onClick={() => setStep('outlet')}
                  className="flex-1 py-2.5 rounded-lg text-white text-sm font-bold tracking-widest uppercase transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#F7941D' }}
                >
                  Outlet
                </button>
                <button
                  onClick={() => setStep('admin')}
                  className="flex-1 py-2.5 rounded-lg text-white text-sm font-bold tracking-widest uppercase transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#F7941D' }}
                >
                  Admin
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text"
                  className="input"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  required
                  autoFocus
                />
                <input
                  type="password"
                  className="input"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  required
                />
                {error && (
                  <p className="text-xs text-red-500 text-center font-medium">{error}</p>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={reset}
                    className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-lg text-white text-sm font-bold tracking-widest uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#F7941D' }}
                  >
                    {loading ? '...' : 'Login'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
