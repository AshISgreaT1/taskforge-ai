import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Filter,
  Search,
  CheckCircle,
  Clock,
  ListTodo,
  Loader2,
  Calendar,
  LayoutGrid,
  List,
  CalendarDays,
  GanttChart,
  X
} from 'lucide-react';
import { taskAPI, projectAPI, authAPI } from '../services/api';
import CalendarView from '../components/CalendarView';
import TimelineView from '../components/TimelineView';
import KanbanBoard from '../components/KanbanBoard';
import { useToast } from '../components/Layout';

const statusConfig = {
  'todo': { label: 'To Do', icon: ListTodo, color: 'bg-slate-500' },
  'in-progress': { label: 'In Progress', icon: Clock, color: 'bg-blue-500' },
  'pending-approval': { label: 'Pending Approval', icon: Clock, color: 'bg-amber-500' },
  'completed': { label: 'Completed', icon: CheckCircle, color: 'bg-green-500' }
};

const priorityConfig = {
  'low': { label: 'Low', color: 'bg-green-500' },
  'medium': { label: 'Medium', color: 'bg-yellow-500' },
  'high': { label: 'High', color: 'bg-orange-500' },
  'critical': { label: 'Critical', color: 'bg-red-500' }
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    project: '',
    assignedTo: '',
    dueDate: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const toast = useToast();

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchUsers();
  }, [filters]);

  const fetchTasks = async () => {
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.project) params.projectId = filters.project;
      if (filters.assignedTo) params.assignedTo = filters.assignedTo;
      if (filters.dueDate) params.dueBefore = filters.dueDate;

      const res = await taskAPI.getTasks(params);
      setTasks(res.data.tasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await projectAPI.getProjects();
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await authAPI.getAllUsers();
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      project: '',
      assignedTo: '',
      dueDate: '',
      search: ''
    });
    toast.info('Filters cleared');
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await taskAPI.updateTaskStatus(taskId, status);
      fetchTasks();
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
    task.description?.toLowerCase().includes(filters.search.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-dark-400">View and manage all your tasks</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input-field pl-11"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-dark-600' : ''}`}
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>
          <div className="flex items-center gap-1 bg-dark-700/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'hover:bg-dark-600'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-primary-600 text-white' : 'hover:bg-dark-600'}`}
              title="Kanban View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'calendar' ? 'bg-primary-600 text-white' : 'hover:bg-dark-600'}`}
              title="Calendar View"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'timeline' ? 'bg-primary-600 text-white' : 'hover:bg-dark-600'}`}
              title="Timeline View"
            >
              <GanttChart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="card"
        >
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Project</label>
              <select
                value={filters.project}
                onChange={(e) => setFilters({ ...filters, project: e.target.value })}
                className="input-field min-w-[150px]"
              >
                <option value="">All Projects</option>
                {projects.map(project => (
                  <option key={project._id} value={project._id}>{project.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="input-field min-w-[150px]"
              >
                <option value="">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="pending-approval">Pending Approval</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="input-field min-w-[150px]"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Assigned To</label>
              <select
                value={filters.assignedTo}
                onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}
                className="input-field min-w-[150px]"
              >
                <option value="">All Members</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>{user.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Due Date</label>
              <input
                type="date"
                value={filters.dueDate}
                onChange={(e) => setFilters({ ...filters, dueDate: e.target.value })}
                className="input-field min-w-[150px]"
              />
            </div>
            {(filters.status || filters.priority || filters.project || filters.assignedTo || filters.dueDate) && (
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-600/20 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {viewMode === 'calendar' && (
        <CalendarView
          tasks={filteredTasks}
          onTaskClick={() => {}}
        />
      )}

      {viewMode === 'timeline' && (
        <TimelineView
          tasks={filteredTasks}
          projects={projects}
          onTaskClick={() => {}}
        />
      )}

      {viewMode === 'kanban' && filteredTasks.length > 0 && (
        <KanbanBoard
          tasks={filteredTasks}
          onStatusChange={handleStatusChange}
          onDelete={() => {}}
          onEdit={() => {}}
        />
      )}

      {(viewMode === 'list' || viewMode === 'kanban') && filteredTasks.length === 0 ? (
        <div className="card text-center py-12">
          <ListTodo className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No tasks found</h3>
          <p className="text-dark-400">
            {filters.search || filters.status || filters.priority
              ? 'Try adjusting your filters'
              : 'Create a task in a project to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task, index) => (
            <motion.div
              key={task._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="card-hover flex items-center gap-4"
            >
              <div className="flex-shrink-0">
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(task._id, e.target.value)}
                  className={`w-6 h-6 rounded border-2 ${statusConfig[task.status].color} border-transparent cursor-pointer`}
                  style={{
                    backgroundColor: statusConfig[task.status].color,
                    appearance: 'none',
                    padding: 0
                  }}
                >
                  <option value="todo" />
                  <option value="in-progress" />
                  <option value="pending-approval" />
                  <option value="completed" />
                </select>
              </div>

              <div className="flex-1 min-w-0">
                <Link
                  to={`/projects/${task.projectId?._id}`}
                  className="block"
                >
                  <h3 className="font-semibold hover:text-primary-400 transition-colors truncate">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-dark-400 truncate mt-1">
                      {task.description}
                    </p>
                  )}
                </Link>
              </div>

              <div className="hidden md:flex items-center gap-4 flex-shrink-0">
                {task.dueDate && (
                  <div className="flex items-center gap-2 text-dark-400 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                )}

                {task.assignedTo && (
                  <div className="flex items-center gap-2">
                    <img
                      src={task.assignedTo.avatar}
                      alt={task.assignedTo.name}
                      className="w-6 h-6 rounded-full"
                      title={task.assignedTo.name}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${priorityConfig[task.priority].color}`} />
                  <span className="text-sm text-dark-400 capitalize">{task.priority}</span>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  task.status === 'pending-approval' ? 'bg-amber-500/20 text-amber-400' :
                  task.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {statusConfig[task.status].label}
                </span>

                {task.projectId && (
                  <Link
                    to={`/projects/${task.projectId._id}`}
                    className="text-sm text-primary-400 hover:text-primary-300"
                  >
                    {task.projectId.title}
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-dark-400">
        <span>Showing {filteredTasks.length} of {tasks.length} tasks</span>
      </div>
    </div>
  );
}
