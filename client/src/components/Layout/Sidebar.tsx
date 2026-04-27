import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const { session, loginManager, exitManager, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [managerPassword, setManagerPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);


  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginManager(managerPassword);
      setShowManagerModal(false);
      setManagerPassword('');
      toast.success('Switched to Manager mode');
      navigate('/outlet/menu');
    } catch {
      toast.error('Invalid manager password');
    } finally {
      setLoading(false);
    }
  };

  const handleExitManager = async () => {
    await exitManager();
    toast.success('Returned to Operator mode');
    navigate('/outlet/pos');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!session) return null;

  // Admin sidebar
  if (session.type === 'admin') {
    return (
      <aside className="w-48 bg-gray-900 text-white flex flex-col min-h-screen flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-700/50 flex items-center gap-3">
          <img src="/logo.png" alt="logo" className="h-12 w-12 object-contain flex-shrink-0" />
          <div>
            <div className="text-xs font-bold text-white leading-tight">The Highlander's</div>
            <div className="text-xs font-bold text-primary-400 leading-tight">Shawarma</div>
            <div className="text-xs text-gray-500 mt-0.5">Admin</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {[
            { to: '/admin/dashboard', label: 'Dashboard' },
            { to: '/admin/outlets', label: 'Outlets' },
            { to: '/admin/reports', label: 'Reports' },
            { to: '/admin/settings', label: 'Settings' },
          ].map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-primary-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }>{label}</NavLink>
          ))}
        </nav>
        <div className="px-3 pb-4 border-t border-gray-700/50 pt-3">
          <div className="px-3 py-2 text-xs text-gray-500 truncate">{session.adminName}</div>
          <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            Logout
          </button>
        </div>
      </aside>
    );
  }

  // Outlet sidebar
  const isManager = session.mode === 'manager';

  const operatorLinks = [
    { to: '/outlet/home', label: 'Home' },
    { to: '/outlet/pos', label: 'POS' },
    { to: '/outlet/all-orders', label: 'Orders' },
    { to: '/outlet/kds', label: 'Kitchen' },
    { to: '/outlet/zomato', label: 'Zomato', accent: 'text-red-400' },
    { to: '/outlet/swiggy', label: 'Swiggy', accent: 'text-orange-400' },
    { to: '/outlet/reports', label: 'Reports' },
  ];

  const managerLinks = [
    { to: '/outlet/menu', label: 'Menu' },
    { to: '/outlet/categories', label: 'Categories' },
    { to: '/outlet/tables', label: 'Tables' },
    { to: '/outlet/settings', label: 'Tax' },
  ];

  const links = isManager ? managerLinks : operatorLinks;

  return (
    <div className="relative flex-shrink-0">
    <aside className={`${collapsed ? 'w-0' : 'w-48'} bg-gray-900 text-white flex flex-col min-h-screen overflow-hidden transition-all duration-300`}>
      <div className="px-4 py-4 border-b border-gray-700/50 flex items-center gap-3">
        <img src="/logo.png" alt="logo" className="h-12 w-12 object-contain flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-xs font-bold text-white truncate leading-tight">{session.outletName}</div>
          <div className={`text-xs font-semibold leading-tight mt-0.5 ${isManager ? 'text-primary-400' : 'text-gray-500'}`}>
            {isManager ? 'Manager Mode' : 'Operator'}
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ to, label, accent }: any) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-primary-500 text-white' : `${accent || 'text-gray-400'} hover:bg-gray-800 hover:text-white`
            }`
          }>{label}</NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 border-t border-gray-700/50 pt-3 space-y-0.5">
        {!isManager ? (
          <button
            onClick={() => setShowManagerModal(true)}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-gray-800 transition-colors"
          >
            Login as Manager
          </button>
        ) : (
          <button
            onClick={handleExitManager}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-gray-800 transition-colors"
          >
            Exit Manager Mode
          </button>
        )}
        <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
          Logout
        </button>
      </div>
    </aside>

    <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute right-0 top-0 translate-x-full w-5 h-[52px] bg-gray-900 hover:bg-gray-700 text-gray-300 hover:text-white rounded-r-xl flex items-center justify-center transition-all duration-200 shadow-lg z-10"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-3 h-3 transition-transform duration-300 ${collapsed ? 'rotate-0' : 'rotate-180'}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Manager login modal */}
      {showManagerModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl text-gray-900">
            <h2 className="font-semibold text-gray-900 mb-1">Manager Login</h2>
            <p className="text-xs text-gray-400 mb-4">Enter the manager password to switch modes.</p>
            <form onSubmit={handleManagerLogin} className="space-y-4">
              <input
                type="password"
                className="input"
                placeholder="Manager password"
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
                autoFocus
                required
              />
              <div className="flex gap-3">
                <button type="button" className="btn-secondary flex-1" onClick={() => { setShowManagerModal(false); setManagerPassword(''); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={loading}>
                  {loading ? '...' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
