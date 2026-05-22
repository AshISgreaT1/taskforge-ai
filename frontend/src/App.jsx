import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Tasks from './pages/Tasks';
import Analytics from './pages/Analytics';
import Team from './pages/Team';
import Settings from './pages/Settings';
import { chatAPI, fileAPI, projectAPI, taskAPI } from './services/api';

const mediaTypes = {
  image: 'image',
  audio: 'audio',
  video: 'video'
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="approvals" element={<AdminRoute><ApprovalDashboard /></AdminRoute>} />
        <Route path="chat" element={<ProjectChatPage />} />
        <Route path="users" element={<AdminRoute><Team /></AdminRoute>} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="team" element={<Team />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" replace />;
};

function ApprovalDashboard() {
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchApprovals = async () => {
    try {
      const res = await taskAPI.getPendingApprovals();
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error('Error fetching approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleDecision = async (taskId, action) => {
    const note = notes[taskId] || '';
    if (action === 'approve') {
      await taskAPI.approveTask(taskId, note);
    } else {
      await taskAPI.rejectTask(taskId, note);
    }
    setNotes(prev => ({ ...prev, [taskId]: '' }));
    fetchApprovals();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Task Approval</h1>
        <p className="text-dark-400">Review tasks submitted for completion</p>
      </div>
      {tasks.length === 0 ? (
        <div className="card text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No pending approvals</h3>
          <p className="text-dark-400">Submitted tasks will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <div key={task._id} className="card">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4 justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg">{task.title}</h3>
                  <p className="text-sm text-dark-400 mt-1">{task.description || 'No description'}</p>
                  <div className="flex flex-wrap gap-3 mt-3 text-sm text-dark-400">
                    <span>{task.projectId?.title}</span>
                    {task.assignedTo && <span>Assigned to {task.assignedTo.name}</span>}
                    <span className="capitalize">{task.priority}</span>
                  </div>
                </div>
                <div className="w-full lg:w-80 space-y-3">
                  <textarea
                    value={notes[task._id] || ''}
                    onChange={(e) => setNotes({ ...notes, [task._id]: e.target.value })}
                    className="input-field min-h-[88px]"
                    placeholder="Approval note"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleDecision(task._id, 'reject')} className="btn-secondary text-red-400">Reject</button>
                    <button onClick={() => handleDecision(task._id, 'approve')} className="btn-primary">Approve</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectChatPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    projectAPI.getProjects().then(res => {
      const projectList = res.data.projects || [];
      setProjects(projectList);
      if (projectList[0]) setSelectedProject(projectList[0]._id);
    }).catch(err => console.error('Error fetching projects:', err));
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [selectedProject]);

  const fetchMessages = async () => {
    try {
      const res = await chatAPI.getMessages(selectedProject);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const sendMessage = async (payload) => {
    await chatAPI.sendMessage(selectedProject, payload);
    setContent('');
    fetchMessages();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    await sendMessage({ content, messageType: 'text' });
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('projectId', selectedProject);
      const res = await fileAPI.uploadFile(form);
      const type = Object.keys(mediaTypes).find(key => file.type.startsWith(`${key}/`)) || 'text';
      await sendMessage({
        content: file.name,
        messageType: mediaTypes[type] || 'text',
        mediaUrl: res.data.file.url
      });
    } catch (err) {
      console.error('Error uploading chat file:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const renderMedia = (message) => {
    if (!message.mediaUrl) return null;
    if (message.messageType === 'image') return <img src={message.mediaUrl} alt={message.content} className="mt-2 max-h-56 rounded-lg" />;
    if (message.messageType === 'audio') return <audio controls src={message.mediaUrl} className="mt-2 w-full" />;
    if (message.messageType === 'video') return <video controls src={message.mediaUrl} className="mt-2 max-h-56 rounded-lg w-full" />;
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Project Chat</h1>
        <p className="text-dark-400">Project specific rooms for messages and media</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 min-h-[640px]">
        <div className="card p-3">
          <div className="space-y-2">
            {projects.map(project => (
              <button
                key={project._id}
                onClick={() => setSelectedProject(project._id)}
                className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${selectedProject === project._id ? 'bg-primary-600/20 text-primary-400' : 'hover:bg-dark-700'}`}
              >
                <p className="font-medium truncate">{project.title}</p>
                <p className="text-xs text-dark-400">{project.members?.length || 0} members</p>
              </button>
            ))}
          </div>
        </div>
        <div className="card p-0 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            {messages.map(message => {
              const isMine = message.sender?._id === user?.id;
              return (
                <div key={message._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 ${isMine ? 'bg-primary-600 text-white' : 'bg-dark-700'}`}>
                    <p className="text-xs opacity-80 mb-1">{message.sender?.name || 'User'}</p>
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    {renderMedia(message)}
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && <p className="text-center text-dark-400 py-16">No messages yet</p>}
          </div>
          <form onSubmit={handleSubmit} className="p-4 border-t border-dark-700 flex items-center gap-3">
            <label className="btn-secondary cursor-pointer">
              {uploading ? 'Uploading...' : 'Upload'}
              <input type="file" accept="image/*,audio/*,video/*" className="hidden" onChange={handleFile} disabled={uploading} />
            </label>
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input-field"
              placeholder="Write a message..."
            />
            <button type="submit" className="btn-primary">Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
