import { useState } from 'react';
import { updateAdminCredentials } from '../../api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const { session, logout } = useAuthStore();
  const currentUsername = session?.type === 'admin' ? session.adminName : '';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newUsername.trim() && !newPassword.trim()) {
      setError('Enter a new username or new password to update.');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await updateAdminCredentials({
        currentPassword,
        ...(newUsername.trim() && { newUsername: newUsername.trim() }),
        ...(newPassword.trim() && { newPassword: newPassword.trim() }),
      });
      toast.success('Credentials updated. Please log in again.');
      setTimeout(() => { logout(); }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-1">Account Settings</h1>
      <p className="text-sm text-gray-500 mb-8">Update your admin login credentials.</p>

      <div className="card">
        <div className="mb-5 pb-5 border-b border-gray-100">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Current Username</p>
          <p className="text-sm font-semibold text-gray-800">{currentUsername}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Current Password <span className="text-red-400">*</span></label>
            <input
              type="password"
              className="input"
              placeholder="Enter current password to confirm"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setError(''); }}
              required
            />
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Change Username</p>
            <input
              type="text"
              className="input"
              placeholder="New username (leave blank to keep)"
              value={newUsername}
              onChange={(e) => { setNewUsername(e.target.value); setError(''); }}
            />
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Change Password</p>
            <div className="space-y-3">
              <input
                type="password"
                className="input"
                placeholder="New password (leave blank to keep)"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
              />
              <input
                type="password"
                className="input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
