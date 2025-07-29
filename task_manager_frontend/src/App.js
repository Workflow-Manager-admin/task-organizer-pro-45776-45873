import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import './App.css';

// === ENV VARS ===
const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000/api';

// ======================
// Utility - Theming
// ======================
const themeVars = {
  light: {
    '--primary': '#1976d2',
    '--secondary': '#424242',
    '--accent': '#ff8a65',
    '--background': '#fff',
    '--foreground': '#f8f9fa',
    '--text-primary': '#232323',
    '--text-secondary': '#666',
    '--border': '#e0e0e0',
    '--button-bg': '#1976d2',
    '--button-text': '#fff',
    '--sidebar-bg': '#f4f6fc',
  },
};
const setThemeColors = (mode) => {
  const root = document.documentElement;
  Object.entries(themeVars[mode]).forEach(([k, v]) => root.style.setProperty(k, v));
};

// ==============================
// Auth/User Context & Hook
// ==============================
const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// PUBLIC_INTERFACE
function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Optionally restore from localStorage/sessionStorage
    const u = window.localStorage.getItem('tm_user');
    return u ? JSON.parse(u) : null;
  });
  const [token, setToken] = useState(() => window.localStorage.getItem('tm_token') || null);

  // PUBLIC_INTERFACE
  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
    window.localStorage.setItem('tm_user', JSON.stringify(data.user));
    window.localStorage.setItem('tm_token', data.token);
    return data;
  };

  // PUBLIC_INTERFACE
  const signup = async (email, password) => {
    const res = await fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Signup failed');
    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
    window.localStorage.setItem('tm_user', JSON.stringify(data.user));
    window.localStorage.setItem('tm_token', data.token);
    return data;
  };

  // PUBLIC_INTERFACE
  const logout = () => {
    setUser(null);
    setToken(null);
    window.localStorage.removeItem('tm_user');
    window.localStorage.removeItem('tm_token');
  };

  const value = useMemo(() => ({ user, token, login, logout, signup }), [user, token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// PUBLIC_INTERFACE
function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ==============================
// Task Context & Hook
// ==============================
const TaskContext = createContext();
export const useTasks = () => useContext(TaskContext);

// PUBLIC_INTERFACE
function TaskProvider({ children }) {
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch tasks
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_URL}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setTasks(data.tasks || []);
        setLoading(false);
      });
  }, [token]);

  // PUBLIC_INTERFACE
  const createTask = async (task) => {
    const res = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Failed to create');
    const data = await res.json();
    setTasks(prev => [data.task, ...prev]);
  };

  // PUBLIC_INTERFACE
  const updateTask = async (id, updates) => {
    const res = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update');
    const data = await res.json();
    setTasks(prev => prev.map(t => (t.id === id ? data.task : t)));
  };

  // PUBLIC_INTERFACE
  const deleteTask = async (id) => {
    const res = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to delete');
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // PUBLIC_INTERFACE
  const reloadTasks = () => {
    setLoading(true);
    fetch(`${API_URL}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setTasks(data.tasks || []);
        setLoading(false);
      });
  };

  const value = useMemo(() => ({
    tasks, loading, createTask, updateTask, deleteTask, reloadTasks
  }), [tasks, loading]);
  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

// ========================
// UI COMPONENTS
// ========================
function Sidebar({ current, setFilter, onLogout }) {
  return (
    <nav className="tm-sidebar" style={{
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border)',
      width: 220,
      minHeight: '100vh',
      padding: '32px 2px 12px 2px',
      display: 'flex', flexDirection: 'column', gap: 12
    }}>
      <div style={{ fontWeight: 'bold', color: 'var(--primary)', margin: '0 0 2rem 22px', fontSize: 21, letterSpacing: 1 }}>
        <Link to="/" style={{textDecoration: 'none', color: 'var(--primary)'}}>Task Manager</Link>
      </div>
      <button className={current === 'all' ? 'tm-navlink active' : 'tm-navlink'} onClick={() => setFilter('all')}>All Tasks</button>
      <button className={current === 'active' ? 'tm-navlink active' : 'tm-navlink'} onClick={() => setFilter('active')}>Active</button>
      <button className={current === 'completed' ? 'tm-navlink active' : 'tm-navlink'} onClick={() => setFilter('completed')}>Completed</button>
      <button className={current === 'priority' ? 'tm-navlink active' : 'tm-navlink'} onClick={() => setFilter('priority')}>Priority</button>
      <div style={{flex: 1}} />
      <button className="tm-navlink" style={{ color: 'var(--accent)', marginBottom: 10 }} onClick={onLogout}>Logout</button>
    </nav>
  );
}

function TopBar({ user, onThemeToggle, theme }) {
  return (
    <header className="tm-topbar" style={{
      height: 56,
      background: 'var(--foreground)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 2rem', justifyContent: 'space-between',
      gap: '1.5rem'
    }}>
      <div />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{fontWeight: 500}}>👤 {user.email}</span>
        <button className="theme-toggle" style={{
          background: 'var(--accent)', color: 'white',
          border: 0, borderRadius: 7, padding: '7px 13px', cursor: 'pointer', fontWeight: 500
        }} onClick={onThemeToggle}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
    </header>
  );
}

// Task Card
function TaskCard({ task, onEdit, onDelete, onToggleComplete }) {
  return (
    <div className={`tm-task-card ${task.completed ? 'completed' : ''}`} style={{
      background: 'var(--background)',
      border: '1px solid var(--border)',
      borderRadius: 9,
      padding: 18,
      marginBottom: 13,
      boxShadow: '0 1px 8px 0 #0001',
      display: 'flex', alignItems: 'flex-start', gap: 15, position: 'relative'
    }}>
      <input
        type="checkbox"
        checked={!!task.completed}
        style={{ marginTop: 2, accentColor: 'var(--primary)' }}
        onChange={() => onToggleComplete(task.id, !task.completed)}
        aria-label="Mark complete/incomplete"
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 17, color: task.completed ? '#aaa' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none' }}>
          {task.title}
        </div>
        <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>{task.description}</div>
        <div style={{ marginTop: 6, fontSize: 12, color: (task.due_date && !task.completed && new Date(task.due_date) < new Date()) ? 'red' : '#555' }}>
          {task.due_date && <>Due: {new Date(task.due_date).toLocaleDateString()}</>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--secondary)', fontWeight: 500 }}>
          {task.priority && <>Priority: {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</>}
        </div>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="tm-task-btn" style={{ background: 'var(--accent)' }} title="Edit" onClick={() => onEdit(task)}>&#9998;</button>
        <button className="tm-task-btn" style={{ background: '#e53935' }} title="Delete" onClick={() => onDelete(task.id)}>&#10005;</button>
      </div>
    </div>
  );
}

// Task Modal (for create/edit)
function TaskModal({ open, onClose, onSave, editingTask }) {
  const [title, setTitle] = useState(editingTask?.title || '');
  const [description, setDescription] = useState(editingTask?.description || '');
  const [priority, setPriority] = useState(editingTask?.priority || 'medium');
  const [dueDate, setDueDate] = useState(editingTask?.due_date ? editingTask.due_date.slice(0, 10) : '');
  useEffect(() => {
    setTitle(editingTask?.title || '');
    setDescription(editingTask?.description || '');
    setPriority(editingTask?.priority || 'medium');
    setDueDate(editingTask?.due_date ? editingTask.due_date.slice(0, 10) : '');
  }, [editingTask, open]);
  if (!open) return null;
  return (
    <div className="tm-modal-backdrop" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: '#23282faa', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="tm-modal" style={{
        background: 'var(--background)', borderRadius: 12,
        padding: '32px 34px', width: 375, boxShadow: '0 9px 40px #0002', display: 'flex', flexDirection: 'column', gap: 14
      }}>
        <h2 style={{margin:'0 0 12px 0', fontSize: 18, fontWeight: 700}}>{editingTask ? 'Edit Task' : 'Create Task'}</h2>
        <label style={{width:'100%'}}>Title
          <input value={title} required onChange={e => setTitle(e.target.value)} />
        </label>
        <label style={{width:'100%'}}>Description
          <textarea style={{ minHeight: 40 }} value={description} onChange={e => setDescription(e.target.value)} />
        </label>
        <label>Priority
          <select value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label>Due Date
          <input type="date" value={dueDate} min={new Date().toISOString().split('T')[0]} onChange={e => setDueDate(e.target.value)} />
        </label>
        <div style={{display: 'flex', gap: 13, justifyContent:'flex-end', marginTop: 8}}>
          <button onClick={onClose} style={{border:0, background:'#eee',fontWeight:500, borderRadius:5,padding:'4px 13px'}}>Cancel</button>
          <button onClick={() => {
            if(!title) return;
            onSave({ title, description, priority, due_date: dueDate });
          }} style={{border: 0, background:'var(--primary)', color:'white', fontWeight:700, borderRadius:5, padding:'4px 13px'}}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ==================
// Pages
// ==================
function TaskListPage() {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    if (filter === 'active') return tasks.filter(t => !t.completed);
    if (filter === 'completed') return tasks.filter(t => t.completed);
    if (filter === 'priority') return tasks.slice().sort((a, b) => {
      const val = {high:3, medium:2, low:1};
      return (val[b.priority]||0)-(val[a.priority]||0);
    });
    return tasks;
  }, [filter, tasks]);

  return (
    <div className="tm-main-content" style={{ flex: 1, background: 'var(--background)', minHeight: '100vh', padding: '2rem 0 0 0', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 1.8rem 0', padding: '0 4vw' }}>
        <h1 style={{ fontWeight: 700 }}>My Tasks</h1>
        <button style={{ background: 'var(--accent)', color: 'white', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 16, padding: '7px 22px' }} onClick={() => { setEditingTask(null); setShowModal(true); }}>+ New Task</button>
      </div>
      {loading && <div style={{ paddingLeft: '4vw' }}>Loading...</div>}
      {!loading && filteredTasks.length === 0 && (<div style={{ color: '#888', fontSize: 18, padding: '24px 4vw' }}>No tasks to show.</div>)}
      <div style={{ maxWidth: 850, margin: '0 auto', padding: '0 4vw' }}>
        {filteredTasks.map(task =>
          <TaskCard
            key={task.id}
            task={task}
            onEdit={t => { setEditingTask(t); setShowModal(true); }}
            onDelete={deleteTask}
            onToggleComplete={(id, complete) => updateTask(id, { completed: complete })}
          />
        )}
      </div>
      <TaskModal
        open={showModal}
        onClose={() => setShowModal(false)}
        editingTask={editingTask}
        onSave={async (data) => {
          if (editingTask) await updateTask(editingTask.id, data);
          else await createTask({...data, completed: false});
          setShowModal(false);
        }}
      />
      <div className="tm-filter-bar" style={{ position:'fixed', left:220, top:56, background:'var(--sidebar-bg)', height:40, display:'flex', alignItems:'center', gap:14, paddingLeft:24, width:'calc(100vw - 220px)', borderBottom:'1px solid var(--border)', zIndex:4 }}>
        <span style={{color:'var(--secondary)'}}>View:</span>
        <button className={filter === 'all' ? 'tm-navlink active' : 'tm-navlink'} onClick={() => setFilter('all')}>All</button>
        <button className={filter === 'active' ? 'tm-navlink active' : 'tm-navlink'} onClick={() => setFilter('active')}>Active</button>
        <button className={filter === 'completed' ? 'tm-navlink active' : 'tm-navlink'} onClick={() => setFilter('completed')}>Completed</button>
        <button className={filter === 'priority' ? 'tm-navlink active' : 'tm-navlink'} onClick={() => setFilter('priority')}>Priority</button>
      </div>
    </div>
  );
}

// Login/signup pages
function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await login(email, password);
      navigate('/');
    } catch (e) {
      setErr('Invalid login.');
    }
  };

  return (
    <div className="tm-auth-page">
      <form className="tm-auth-form" style={{
        background: 'var(--background)', padding: 33, borderRadius: 14, boxShadow: '0 7px 25px #0001', width: 340, margin: '90px auto 0'
      }} onSubmit={handleLogin}>
        <h2 style={{margin:0, color:'var(--primary)'}}>Sign In</h2>
        <label>Email
          <input value={email} onChange={e=>setEmail(e.target.value)} required type="email" />
        </label>
        <label>Password
          <input value={password} onChange={e=>setPassword(e.target.value)} required type="password" />
        </label>
        {err && <div style={{color:'red', marginTop:6}}>{err}</div>}
        <button type="submit" style={{marginTop:17, background:'var(--primary)', color:'white', border:0, borderRadius:5, fontWeight:600, padding:'7px 0'}}>LOGIN</button>
        <div style={{marginTop:10,fontSize:13}}>No account? <Link to="/signup" style={{color:'var(--accent)'}}>Sign up</Link></div>
      </form>
    </div>
  );
}

// Signup
function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const handleSignup = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await signup(email, password);
      navigate('/');
    } catch (e) {
      setErr('Signup failed.');
    }
  };
  return (
    <div className="tm-auth-page">
      <form className="tm-auth-form" style={{
        background: 'var(--background)', padding: 33, borderRadius: 14, boxShadow: '0 7px 25px #0001', width: 340, margin: '90px auto 0'
      }} onSubmit={handleSignup}>
        <h2 style={{margin:0, color:'var(--primary)'}}>Sign Up</h2>
        <label>Email
          <input value={email} onChange={e=>setEmail(e.target.value)} required type="email" />
        </label>
        <label>Password
          <input value={password} onChange={e=>setPassword(e.target.value)} required type="password" />
        </label>
        {err && <div style={{color:'red', marginTop:6}}>{err}</div>}
        <button type="submit" style={{marginTop:17, background:'var(--primary)', color:'white', border:0, borderRadius:5, fontWeight:600, padding:'7px 0'}}>SIGN UP</button>
        <div style={{marginTop:10,fontSize:13}}>Already have an account? <Link to="/login" style={{color:'var(--accent)'}}>Sign in</Link></div>
      </form>
    </div>
  );
}

// ==================
// Main App Shell
// ==================
function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState('light');
  useEffect(() => { setThemeColors(theme); }, [theme]);
  // Responsive sidebar
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 800);
  useEffect(() => {
    const onResize = () => setSidebarOpen(window.innerWidth > 800);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return (
    <div style={{display:'flex'}}>
      {sidebarOpen && <Sidebar current="all" setFilter={()=>{}} onLogout={logout} />}
      <div style={{flex:1, minHeight:'100vh', background: 'var(--background)', display:'flex', flexDirection:'column'}}>
        <TopBar user={user} onThemeToggle={() => setTheme(t => t === 'light' ? 'dark':'light')} theme={theme}/>
        <main style={{flex:1}}>{children}</main>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  useEffect(() => { setThemeColors('light'); }, []);
  return (
    <AuthProvider>
      <TaskProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />}/>
            <Route path="/signup" element={<SignupPage />}/>
            <Route path="/*" element={
              <RequireAuth>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<TaskListPage />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </AppLayout>
              </RequireAuth>
            } />
          </Routes>
        </Router>
      </TaskProvider>
    </AuthProvider>
  );
}
export default App;
