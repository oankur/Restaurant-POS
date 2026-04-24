import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface Props {
  children: React.ReactNode;
  require: 'outlet' | 'admin' | 'manager';
}

export default function ProtectedRoute({ children, require }: Props) {
  const { token, session } = useAuthStore();
  if (!token || !session) return <Navigate to="/login" replace />;

  if (require === 'admin' && session.type !== 'admin') return <Navigate to="/login" replace />;
  if (require === 'outlet' && session.type !== 'outlet') return <Navigate to="/login" replace />;
  if (require === 'manager' && (session.type !== 'outlet' || session.mode !== 'manager'))
    return <Navigate to="/outlet/pos" replace />;

  return <>{children}</>;
}
