# TaskForge AI

Intelligent Team Project & Task Management Platform with AI-powered features.

## Features

- **JWT Authentication** - Secure login/signup with role-based access control
- **Project Management** - Create, edit, and manage team projects
- **Task System** - Create tasks with priorities, due dates, and assignments
- **AI Task Breakdown** - Automatically generate subtasks from main tasks
- **Priority Heat System** - Visual priority indicators (Low/Medium/High/Critical)
- **Smart Delay Prediction** - AI-powered project timeline predictions
- **Leaderboard** - Team productivity tracking
- **Dashboard** - Comprehensive analytics and metrics

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS + React Router + Axios
- **Backend**: Node.js + Express.js + JWT + bcrypt
- **Database**: MongoDB + Mongoose

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Installation

1. **Clone the repository**
   ```bash
   cd taskforge-ai
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configure environment variables**

   Create a `.env` file in the `backend` directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/taskforge-ai
   JWT_SECRET=your-secret-key
   JWT_EXPIRE=7d
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   ```

### Running the Application

1. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

2. **Start the backend**
   ```bash
   cd backend
   npm run dev
   ```

3. **Start the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm run dev
   ```

4. **Seed demo data** (optional)
   ```bash
   cd backend
   node seed.js
   ```

### Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Demo Credentials

```
Admin: admin@taskforge.ai / password123
Member: sarah@taskforge.ai / password123
Member: mike@taskforge.ai / password123
Member: emily@taskforge.ai / password123
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `GET /api/auth/users` - Get all users

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `PATCH /api/tasks/:id/status` - Update task status
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/ai/prediction/:projectId` - Get AI prediction

### Dashboard
- `GET /api/dashboard` - Get dashboard data
- `GET /api/dashboard/team` - Get team statistics

## Deployment

### Railway Deployment

1. Create a new project on [Railway](https://railway.app)
2. Add MongoDB plugin
3. Connect your GitHub repository
4. Set environment variables in Railway dashboard:
   - `MONGODB_URI` - MongoDB connection string
   - `JWT_SECRET` - Your secure JWT secret
   - `CORS_ORIGIN` - Your Railway domain
5. Deploy

## Project Structure

```
taskforge-ai/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── dashboardController.js
│   │   ├── projectController.js
│   │   └── taskController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── Project.js
│   │   ├── Task.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── projects.js
│   │   └── tasks.js
│   ├── seed.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx
│   │   ├── hooks/
│   │   │   └── useAuth.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── ProjectDetail.jsx
│   │   │   ├── Projects.jsx
│   │   │   ├── Signup.jsx
│   │   │   └── Tasks.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── deployment/
│   ├── Dockerfile
│   ├── env.production
│   └── railway.json
└── README.md
```

## License

MIT