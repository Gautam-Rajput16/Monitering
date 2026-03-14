import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { logout } = useAuth();
  
  const navItems = [
    { path: '/dashboard', label: 'Dashboard Overview', icon: '📊' },
    { path: '/users', label: 'User Management', icon: '👥' },
    { path: '/location', label: 'Live Location', icon: '🗺️' },
    { path: '/camera', label: 'Camera Stream', icon: '📸' },
    { path: '/screen', label: 'Screen Share', icon: '💻' },
    { path: '/audio', label: 'Audio Monitor', icon: '🎤' },
  ];

  const getClassName = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive 
        ? 'bg-blue-600 bg-opacity-10 text-blue-400 border border-blue-500/20' 
        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
    }`;

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 h-full flex flex-col pt-4">
      <div className="flex-1 px-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-4">
          Monitoring Tools
        </div>
        <ul className="space-y-1.5">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink to={item.path} className={getClassName}>
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium text-sm">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium border border-red-500/20"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
