import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useFirebase } from '../lib/FirebaseContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  Phone,
  Users,
  UserRound,
  MessageSquare,
  ClipboardList,
  BarChart3,
  LogOut,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Calls', icon: Phone, path: '/calls', group: 'COMMUNICATIONS' },
  { label: 'Leads', icon: Users, path: '/leads', group: 'CRM' },
  { label: 'Agents', icon: UserRound, path: '/agents' },
  { label: 'Messages', icon: MessageSquare, path: '/messages', group: 'COMMUNICATIONS' },
  { label: 'Surveys', icon: ClipboardList, path: '/surveys', group: 'FEEDBACK' },
  { label: 'Reports', icon: BarChart3, path: '/reports', group: 'ANALYTICS' },
];

export default function MainLayout() {
  const { user, loading } = useFirebase();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Get user display name
  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Group nav items
  const renderedGroups = new Set<string>();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 h-screen bg-[#1a1a1a] flex flex-col flex-shrink-0 border-r border-[#2a2a2a]">
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-[#2a2a2a] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#007bff] flex items-center justify-center flex-shrink-0 shadow-md">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-white font-semibold text-sm">Call Hub</span>
              <span className="text-white/60 text-xs font-medium">Pro</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
            const showGroupLabel = item.group && !renderedGroups.has(item.group);
            if (item.group) renderedGroups.add(item.group);

            return (
              <div key={item.path}>
                {showGroupLabel && (
                  <div className="px-3 pt-4 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-white/35 select-none">
                      {item.group}
                    </span>
                  </div>
                )}
                <Link
  to={item.path}
  className={`
    group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 relative
    ${isActive
      ? 'bg-white/10 text-white'
      : 'text-white/70 hover:bg-white/5 hover:text-white'
    }
  `}
>
                  <item.icon
                    size={16}
                    className={`flex-shrink-0 transition-colors ${
                      isActive ? 'text-[#007bff]' : 'text-white/50 group-hover:text-white/80'
                    }`}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && (
                    <ChevronRight size={12} className="text-[#007bff]/70 flex-shrink-0" />
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div className="flex-shrink-0 border-t border-[#2a2a2a] p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-md bg-white/5">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-[#007bff] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{displayName}</p>
              <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm mt-0.5 bg-white/10 text-white/70">
                {user.email}
              </span>
            </div>
            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Logout"
              className="w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {currentPath === '/dashboard' && 'Dashboard'}
              {currentPath === '/calls' && 'Call Logs'}
              {currentPath === '/leads' && 'Leads'}
              {currentPath === '/agents' && 'Agents'}
              {currentPath === '/messages' && 'Messages'}
              {currentPath === '/surveys' && 'Surveys'}
              {currentPath === '/reports' && 'Reports'}
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2.5 pl-1">
              <div className="w-8 h-8 rounded-full bg-[#007bff] flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-semibold">{initials}</span>
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[120px] truncate">
                {displayName}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}