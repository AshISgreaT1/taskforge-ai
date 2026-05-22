import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FolderKanban,
  CheckSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  Trophy,
  Activity,
  ArrowRight
} from 'lucide-react';
import { dashboardAPI } from '../services/api';

const statsCards = [
  { key: 'totalTasks', label: 'Total Tasks', icon: CheckSquare, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { key: 'completedTasks', label: 'Completed', icon: CheckSquare, color: 'text-green-400', bg: 'bg-green-500/20' },
  { key: 'pendingTasks', label: 'Pending', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  { key: 'overdueTasks', label: 'Overdue', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20' }
];

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await dashboardAPI.getDashboard();
      setDashboard(res.data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-dark-400">Welcome back! Here's your overview.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card-hover"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold">{dashboard?.stats?.[stat.key] || 0}</p>
            <p className="text-dark-400 text-sm">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Productivity Overview</h2>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">
                {dashboard?.overallProductivity || 0}%
              </span>
            </div>
          </div>

          <div className="h-48 flex items-end gap-4">
            {['todo', 'in-progress', 'completed'].map((status, idx) => (
              <div key={status} className="flex-1 flex flex-col items-center gap-2">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(dashboard?.tasksByStatus?.[status] / Math.max(dashboard?.stats?.totalTasks, 1)) * 150 || 0}px` }}
                  transition={{ delay: 0.5 + idx * 0.1, duration: 0.5 }}
                  className={`w-full rounded-t-lg ${
                    status === 'todo' ? 'bg-slate-500' :
                    status === 'in-progress' ? 'bg-blue-500' : 'bg-green-500'
                  }`}
                />
                <span className="text-xs text-dark-400 capitalize">{status.replace('-', ' ')}</span>
                <span className="text-sm font-semibold">{dashboard?.tasksByStatus?.[status] || 0}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Project Stats</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
              <span className="text-dark-400">Active Projects</span>
              <span className="font-semibold">{dashboard?.stats?.activeProjects || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
              <span className="text-dark-400">Completed</span>
              <span className="font-semibold text-green-400">{dashboard?.stats?.completedProjects || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
              <span className="text-dark-400">Team Members</span>
              <span className="font-semibold">{dashboard?.leaderboard?.length || 0}</span>
            </div>
          </div>
          <Link
            to="/projects"
            className="mt-4 w-full btn-secondary flex items-center justify-center gap-2"
          >
            View Projects <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold">Leaderboard</h2>
          </div>
          <div className="space-y-3">
            {dashboard?.leaderboard?.slice(0, 5).map((entry, index) => (
              <div
                key={entry.user._id}
                className="flex items-center gap-4 p-3 bg-dark-700/50 rounded-lg"
              >
                <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  index === 1 ? 'bg-gray-400/20 text-gray-300' :
                  index === 2 ? 'bg-amber-600/20 text-amber-500' :
                  'bg-dark-600 text-dark-400'
                }`}>
                  {index + 1}
                </span>
                <img
                  src={entry.user.avatar}
                  alt={entry.user.name}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <p className="font-medium">{entry.user.name}</p>
                  <p className="text-xs text-dark-400">
                    {entry.completedTasks}/{entry.assignedTasks} tasks
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary-400">{entry.productivityScore}%</p>
                  <p className="text-xs text-dark-400">productivity</p>
                </div>
              </div>
            ))}
            {(!dashboard?.leaderboard || dashboard.leaderboard.length === 0) && (
              <p className="text-dark-400 text-center py-4">No leaderboard data yet</p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold">Recent Activity</h2>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {dashboard?.recentActivity?.map((task) => (
              <div
                key={task._id}
                className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg"
              >
                <div className={`w-2 h-2 rounded-full ${
                  task.status === 'completed' ? 'bg-green-500' :
                  task.status === 'in-progress' ? 'bg-blue-500' : 'bg-slate-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{task.title}</p>
                  <p className="text-xs text-dark-400 truncate">{task.projectId?.title}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  task.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'
                }`}>
                  {task.status.replace('-', ' ')}
                </span>
              </div>
            ))}
            {(!dashboard?.recentActivity || dashboard.recentActivity.length === 0) && (
              <p className="text-dark-400 text-center py-4">No recent activity</p>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="card"
      >
        <h2 className="text-lg font-semibold mb-4">Task Priority Distribution</h2>
        <div className="flex gap-4 flex-wrap">
          {Object.entries(dashboard?.tasksByPriority || {}).map(([priority, count]) => (
            <div
              key={priority}
              className="flex items-center gap-2 px-4 py-2 bg-dark-700/50 rounded-lg"
            >
              <div className={`w-3 h-3 rounded-full priority-${priority}`} />
              <span className="capitalize">{priority}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
