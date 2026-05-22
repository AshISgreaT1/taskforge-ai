import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  Mail,
  Plus,
  Trash2,
  UserX,
  UserCheck,
  X,
  Loader2
} from 'lucide-react';
import { authAPI, projectAPI } from '../services/api';
import { useToast } from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

const jobRoles = ['team-lead', 'frontend-dev', 'backend-dev', 'qa', 'designer', 'member'];

export default function Team() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'member',
    jobRole: 'member'
  });
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, projectsRes] = await Promise.all([
        authAPI.getAllUsers(),
        projectAPI.getProjects()
      ]);
      setUsers(usersRes.data.users || []);
      setProjects(projectsRes.data.projects || []);
    } catch (err) {
      console.error('Error fetching team data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUserProjects = (userId) => {
    return projects.filter(p =>
      p.members?.some(m => (m.user?._id || m._id) === userId) ||
      p.createdBy?._id === userId
    );
  };

  const getUserTaskStats = (userId) => {
    let total = 0;
    let completed = 0;
    projects.forEach(project => {
      if (project.tasks) {
        project.tasks.forEach(task => {
          if (task.assignedTo?._id === userId) {
            total++;
            if (task.status === 'completed') completed++;
          }
        });
      }
    });
    return { total, completed };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authAPI.createUser(formData);
      setShowCreate(false);
      setFormData({ name: '', email: '', password: '', role: 'member', jobRole: 'member' });
      toast.success('User created');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating user');
    } finally {
      setSubmitting(false);
    }
  };

  const updateUser = async (id, data) => {
    try {
      await authAPI.updateUserRole(id, data);
      toast.success('User updated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating user');
    }
  };

  const toggleActive = async (targetUser) => {
    try {
      await authAPI.disableUser(targetUser._id, !targetUser.isActive);
      toast.success(targetUser.isActive ? 'User disabled' : 'User enabled');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating account');
    }
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    try {
      await authAPI.deleteUser(id);
      toast.success('User deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-dark-400">Manage your team members and their roles</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create User
          </button>
        )}
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-11"
            />
          </div>
        </div>

        {filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user, index) => {
              const userProjects = getUserProjects(user._id);
              const taskStats = getUserTaskStats(user._id);
              return (
                <motion.div
                  key={user._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 bg-dark-700/30 rounded-xl hover:bg-dark-700/50 transition-colors"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                      alt={user.name}
                      className="w-12 h-12 rounded-full bg-dark-700"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{user.name}</h3>
                      <div className="flex items-center gap-1 text-dark-400 text-sm">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-dark-800 rounded-lg">
                      <p className="text-lg font-bold text-primary-400">{taskStats.total}</p>
                      <p className="text-xs text-dark-400">Tasks</p>
                    </div>
                    <div className="text-center p-2 bg-dark-800 rounded-lg">
                      <p className="text-lg font-bold text-green-400">{taskStats.completed}</p>
                      <p className="text-xs text-dark-400">Done</p>
                    </div>
                    <div className="text-center p-2 bg-dark-800 rounded-lg">
                      <p className="text-lg font-bold text-blue-400">{userProjects.length}</p>
                      <p className="text-xs text-dark-400">Projects</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="p-2 bg-dark-800 rounded-lg">
                      <p className="text-xs text-dark-400">Account</p>
                      <p className="text-sm font-medium capitalize">{user.role}</p>
                    </div>
                    <div className="p-2 bg-dark-800 rounded-lg">
                      <p className="text-xs text-dark-400">Job Role</p>
                      <p className="text-sm font-medium capitalize">{user.jobRole || 'member'}</p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="space-y-2 mb-4">
                      <select
                        value={user.role}
                        onChange={(e) => updateUser(user._id, { role: e.target.value })}
                        className="input-field text-sm"
                        disabled={user._id === currentUser?.id}
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                      <select
                        value={user.jobRole || 'member'}
                        onChange={(e) => updateUser(user._id, { jobRole: e.target.value })}
                        className="input-field text-sm"
                      >
                        {jobRoles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => toggleActive(user)}
                          disabled={user._id === currentUser?.id}
                          className="btn-secondary flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                          {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          {user.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => deleteUser(user._id)}
                          disabled={user._id === currentUser?.id}
                          className="btn-danger flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}

                  {userProjects.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-dark-400">Projects:</p>
                      <div className="flex flex-wrap gap-2">
                        {userProjects.slice(0, 3).map(project => (
                          <span
                            key={project._id}
                            className="px-2 py-1 bg-dark-800 rounded-lg text-xs truncate max-w-[120px]"
                            title={project.title}
                          >
                            {project.title}
                          </span>
                        ))}
                        {userProjects.length > 3 && (
                          <span className="px-2 py-1 bg-dark-800 rounded-lg text-xs">
                            +{userProjects.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No team members found</h3>
            <p className="text-dark-400">
              {searchQuery ? 'Try adjusting your search' : 'Invite team members to your projects'}
            </p>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Create User</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="Name"
                required
              />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
                placeholder="Email"
                required
              />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input-field"
                placeholder="Password"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="input-field"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  value={formData.jobRole}
                  onChange={(e) => setFormData({ ...formData, jobRole: e.target.value })}
                  className="input-field"
                >
                  {jobRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                Create User
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
