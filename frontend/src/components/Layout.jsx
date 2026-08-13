import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout({ links, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-gray-800">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            <span>GMC, HALDWANI</span>
            <span className="text-xs font-normal text-gray-400 ml-1">PG Attendance Portal</span>
          </div>
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {user?.name} <span className="text-gray-400">({user?.role})</span>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
