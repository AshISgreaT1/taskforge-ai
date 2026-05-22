import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  Users,
  Target
} from 'lucide-react';
import { dashboardAPI, projectAPI } from '../services/api';

export default function Analytics() {
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    teamPerformance: []
  });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashboardRes, projectsRes] = await Promise.all([
        dashboardAPI.getDashboard(),
        projectAPI.getProjects()
      ]);
      setStats(dashboardRes.data);
      setProjects(projectsRes.data.projects || []);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Total Projects',
      value: stats.totalProjects,
      icon: BarChart3,
      color: 'text-primary-500',
      bgColor: 'bg-primary-500/10'
    },
    {
      label: 'Total Tasks',
      value: stats.totalTasks,
      icon: Target,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Completed',
      value: stats.completedTasks,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      trend: 'up'
    },
    {
      label: 'In Progress',
      value: stats.inProgressTasks,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    {
      label: 'Overdue',
      value: stats.overdueTasks,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      trend: 'down'
    }
  ];

  const projectStats = projects.map(project => ({
    name: project.title,
    tasks: project.tasks?.length || 0,
    completed: project.tasks?.filter(t => t.status === 'completed').length || 0
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-dark-400">Track your team performance and project metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              {stat.trend && (
                <div className={`flex items-center gap-1 text-sm ${
                  stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stat.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                </div>
              )}
            </div>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-dark-400 text-sm">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <PieChart className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold">Project Overview</h2>
          </div>
          <div className="space-y-4">
            {projectStats.length > 0 ? (
              projectStats.map((project, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate max-w-[200px]">{project.name}</span>
                    <span className="text-dark-400 text-sm">
                      {project.completed}/{project.tasks} tasks
                    </span>
                  </div>
                  <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${project.tasks > 0 ? (project.completed / project.tasks) * 100 : 0}%` }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                      className="h-full bg-primary-500 rounded-full"
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-dark-400 text-center py-8">No projects yet</p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold">Activity Summary</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-dark-700/50 rounded-xl">
              <Users className="w-8 h-8 text-primary-500 mb-2" />
              <p className="text-2xl font-bold">{stats.teamPerformance?.length || 0}</p>
              <p className="text-dark-400 text-sm">Team Members</p>
            </div>
            <div className="p-4 bg-dark-700/50 rounded-xl">
              <Target className="w-8 h-8 text-green-500 mb-2" />
              <p className="text-2xl font-bold">
                {stats.totalTasks > 0
                  ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
                  : 0}%
              </p>
              <p className="text-dark-400 text-sm">Completion Rate</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}