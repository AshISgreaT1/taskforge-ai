import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  LogOut,
  Menu,
  X,
  User,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Users,
  Settings,
  Search,
  Bell,
  Command,
  FileText,
  FolderKanban as ProjectIcon,
  User as UserIcon,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  ClipboardCheck,
  MessageSquare,
  UserCog
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { notificationAPI, searchAPI } from '../services/api';

const ToastContext = createContext(null);

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const toastColors = {
  success: 'border-green-500 bg-green-500/10',
  error: 'border-red-500 bg-red-500/10',
  warning: 'border-yellow-500 bg-yellow-500/10',
  info: 'border-blue-500 bg-blue-500/10'
};

const toastIconColors = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400'
};

function Toast({ id, type, message, onClose }) {
  const Icon = toastIcons[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={`flex items-start gap-3 p-4 rounded-xl border ${toastColors[type]} shadow-lg max-w-sm`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${toastIconColors[type]}`} />
      <p className="flex-1 text-sm">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="p-1 hover:bg-dark-700 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

function ToastContainer({ toasts, onClose }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map(t => (
          <Toast key={t.id} {...t} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function GlobalSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ tasks: [], projects: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ tasks: [], projects: [], users: [] });
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const search = async () => {
      if (query.length < 2) {
        setResults({ tasks: [], projects: [], users: [] });
        return;
      }

      setLoading(true);
      try {
        const res = await searchAPI.globalSearch(query);
        setResults(res.data.results);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const allResults = [
    ...results.tasks.map(t => ({ ...t, type: 'task' })),
    ...results.projects.map(p => ({ ...p, type: 'project' })),
    ...results.users.map(u => ({ ...u, type: 'user' }))
  ];

  const handleSelect = (item) => {
    if (item.type === 'task') {
      navigate(`/projects/${item.projectId?._id || item.projectId}`);
    } else if (item.type === 'project') {
      navigate(`/projects/${item._id}`);
    }
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      handleSelect(allResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'task': return FileText;
      case 'project': return ProjectIcon;
      case 'user': return UserIcon;
      default: return FileText;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl p-4"
      >
        <div className="bg-dark-800 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-dark-700">
            <Search className="w-5 h-5 text-dark-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tasks, projects, users..."
              className="flex-1 bg-transparent outline-none text-lg"
            />
            <button
              onClick={onClose}
              className="p-1 hover:bg-dark-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading && (
              <div className="p-8 text-center text-dark-400">Searching...</div>
            )}

            {!loading && query.length >= 2 && allResults.length === 0 && (
              <div className="p-8 text-center text-dark-400">No results found</div>
            )}

            {!loading && allResults.length > 0 && (
              <div className="p-2">
                {results.tasks.length > 0 && (
                  <div className="mb-2">
                    <p className="px-3 py-1 text-xs text-dark-400 uppercase">Tasks</p>
                    {results.tasks.map((task, idx) => {
                      const Icon = getIcon('task');
                      const isSelected = selectedIndex === idx;
                      return (
                        <button
                          key={task._id}
                          onClick={() => handleSelect({ ...task, type: 'task' })}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            isSelected ? 'bg-primary-600/20 text-primary-400' : 'hover:bg-dark-700'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{task.title}</p>
                            <p className="text-xs text-dark-400 truncate">{task.projectId?.title}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {results.projects.length > 0 && (
                  <div className="mb-2">
                    <p className="px-3 py-1 text-xs text-dark-400 uppercase">Projects</p>
                    {results.projects.map((project, idx) => {
                      const Icon = getIcon('project');
                      const isSelected = selectedIndex === results.tasks.length + idx;
                      return (
                        <button
                          key={project._id}
                          onClick={() => handleSelect({ ...project, type: 'project' })}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            isSelected ? 'bg-primary-600/20 text-primary-400' : 'hover:bg-dark-700'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{project.title}</p>
                            <p className="text-xs text-dark-400 truncate">{project.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {results.users.length > 0 && (
                  <div>
                    <p className="px-3 py-1 text-xs text-dark-400 uppercase">Users</p>
                    {results.users.map((user, idx) => {
                      const Icon = getIcon('user');
                      const isSelected = selectedIndex === results.tasks.length + results.projects.length + idx;
                      return (
                        <button
                          key={user._id}
                          onClick={() => handleSelect({ ...user, type: 'user' })}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            isSelected ? 'bg-primary-600/20 text-primary-400' : 'hover:bg-dark-700'
                          }`}
                        >
                          <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.name}</p>
                            <p className="text-xs text-dark-400 truncate">{user.email}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {query.length < 2 && (
              <div className="p-8 text-center text-dark-400">
                Type at least 2 characters to search
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700 text-xs text-dark-400">
            <div className="flex items-center gap-4">
              <span><kbd className="px-1.5 py-0.5 bg-dark-700 rounded">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1.5 py-0.5 bg-dark-700 rounded">↵</kbd> Select</span>
              <span><kbd className="px-1.5 py-0.5 bg-dark-700 rounded">esc</kbd> Close</span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/projects', icon: FolderKanban, label: 'Projects' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/approvals', icon: ClipboardCheck, label: 'Task Approval', adminOnly: true },
  { path: '/chat', icon: MessageSquare, label: 'Project Chat' },
  { path: '/users', icon: UserCog, label: 'User Management', adminOnly: true },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/team', icon: Users, label: 'Team' },
  { path: '/settings', icon: Settings, label: 'Settings' }
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const addToast = useCallback((type, message, duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (message) => addToast('success', message),
    error: (message) => addToast('error', message),
    warning: (message) => addToast('warning', message),
    info: (message) => addToast('info', message)
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchNotifications();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const interval = setInterval(fetchNotifications, 5000);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getNotifications();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      fetchNotifications();
    } catch (err) {
      console.error('Error marking notifications:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <ToastContext.Provider value={toast}>
      <div className="min-h-screen bg-dark-900 flex">
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed lg:static inset-y-0 left-0 z-50 w-72 bg-dark-800 border-r border-dark-700 flex flex-col"
              >
                <SidebarContent
                  user={user}
                  navItems={navItems}
                  onLogout={handleLogout}
                  onClose={() => setSidebarOpen(false)}
                  collapsed={false}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <aside
          className={`hidden lg:flex flex-col bg-dark-800 border-r border-dark-700 transition-all duration-300 ${
            sidebarCollapsed ? 'w-20' : 'w-72'
          }`}
        >
          <SidebarContent
            user={user}
            navItems={navItems}
            onLogout={handleLogout}
            onClose={() => {}}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-dark-800 border-b border-dark-700 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-dark-700 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex p-2 rounded-lg hover:bg-dark-700 transition-colors"
              >
                {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex-1 max-w-xl mx-4 hidden md:block">
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-dark-700/50 hover:bg-dark-700 rounded-xl text-dark-400 transition-colors"
              >
                <Search className="w-4 h-4" />
                <span className="flex-1 text-left text-sm">Search tasks, projects, users...</span>
                <kbd className="hidden lg:flex items-center gap-1 px-2 py-0.5 bg-dark-800 rounded text-xs">
                  <Command className="w-3 h-3" />K
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg hover:bg-dark-700 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] leading-[18px] text-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-full mt-2 w-80 bg-dark-800 border border-dark-700 rounded-xl shadow-lg overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-4 border-b border-dark-700">
                        <p className="font-semibold">Notifications</p>
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-xs text-primary-400 hover:text-primary-300"
                        >
                          Mark all read
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="p-4 text-sm text-dark-400">No notifications</p>
                        ) : notifications.map((item) => (
                          <button
                            key={item._id}
                            onClick={async () => {
                              await notificationAPI.markAsRead(item._id);
                              fetchNotifications();
                              if (item.projectId?._id) navigate(`/projects/${item.projectId._id}`);
                              setShowNotifications(false);
                            }}
                            className={`w-full text-left p-4 border-b border-dark-700 hover:bg-dark-700/60 transition-colors ${!item.isRead ? 'bg-primary-600/10' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{item.title}</p>
                                <p className="text-xs text-dark-400 mt-1 line-clamp-2">{item.message}</p>
                              </div>
                              {!item.isRead && <span className="w-2 h-2 mt-1 rounded-full bg-primary-400 flex-shrink-0" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-700 transition-colors"
                >
                  <img
                    src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
                    alt={user?.name}
                    className="w-8 h-8 rounded-full bg-dark-700"
                  />
                  <span className="hidden md:block text-sm font-medium">{user?.name}</span>
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-dark-800 border border-dark-700 rounded-xl shadow-lg overflow-hidden"
                    >
                      <div className="p-4 border-b border-dark-700">
                        <p className="font-medium">{user?.name}</p>
                        <p className="text-sm text-dark-400">{user?.email}</p>
                      </div>
                      <div className="p-2">
                        <NavLink
                          to="/settings"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-700 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          <span>Profile</span>
                        </NavLink>
                        <NavLink
                          to="/settings"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-700 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Settings</span>
                        </NavLink>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-red-600/20 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>

        <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    </ToastContext.Provider>
  );
}

function SidebarContent({ user, navItems, onLogout, onClose, collapsed, onToggleCollapse }) {
  const visibleNavItems = navItems.filter(item => !item.adminOnly || user?.role === 'admin');

  return (
    <div className="flex flex-col h-full">
      <div className={`p-4 lg:p-6 border-b border-dark-700 ${collapsed ? 'px-4' : ''}`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
            {collapsed ? (
              <span className="font-bold text-lg text-primary-400">TF</span>
            ) : (
              <span className="font-bold text-xl">TaskForge</span>
            )}
          </div>
          {collapsed && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="absolute -right-3 top-6 p-1 bg-dark-700 rounded-full"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
          {!collapsed && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-2 lg:p-4 space-y-1">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 lg:px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400'
                  : 'text-dark-300 hover:bg-dark-700 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-dark-700">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
              alt={user?.name}
              className="w-10 h-10 rounded-full bg-dark-700"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.name}</p>
              <p className="text-sm text-dark-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-600/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within Layout');
  }
  return context;
}
