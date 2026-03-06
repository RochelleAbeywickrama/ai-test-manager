import { NavLink, Outlet } from 'react-router-dom';
import {
  FlaskConical,
  ClipboardList,
  FileCode2,
  Play,
  BarChart3,
  Settings,
} from 'lucide-react';

const nav = [
  { to: '/projects', icon: FlaskConical, label: 'Projects' },
  { to: '/plans', icon: ClipboardList, label: 'Test Plans' },
  { to: '/testcases', icon: FileCode2, label: 'Test Cases' },
  { to: '/runs', icon: Play, label: 'Test Runs' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-brand-900 flex flex-col shrink-0">
        <div className="px-5 py-6 border-b border-brand-700">
          <div className="flex items-center gap-2">
            <FlaskConical className="text-brand-100" size={22} />
            <span className="text-white font-bold text-base leading-tight">AI Test Manager</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-brand-100 hover:bg-brand-700 hover:text-white'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-brand-700">
          <p className="text-brand-300 text-xs">Powered by Claude AI</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
