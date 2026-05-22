import { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, differenceInDays, addDays, startOfDay, eachDayOfInterval, min, max, isWithinInterval, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Target, Flag, Clock, User } from 'lucide-react';

const priorityColors = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
};

const statusColors = {
  todo: 'bg-slate-500',
  'in-progress': 'bg-blue-500',
  completed: 'bg-green-500'
};

export default function TimelineView({ tasks, projects, onTaskClick }) {
  const containerRef = useRef(null);
  const [startDate, setStartDate] = useState(null);
  const [daysToShow, setDaysToShow] = useState(30);
  const [viewScale, setViewScale] = useState('day');

  const { timelineStart, timelineEnd, allDays, projectColors } = useMemo(() => {
    const tasksWithDates = tasks.filter(t => t.dueDate || t.createdAt);
    if (tasksWithDates.length === 0) {
      const now = new Date();
      return {
        timelineStart: now,
        timelineEnd: addDays(now, 30),
        allDays: eachDayOfInterval({ start: now, end: addDays(now, 30) }),
        projectColors: {}
      };
    }

    const dates = tasksWithDates.flatMap(t => {
      const arr = [new Date(t.createdAt || Date.now())];
      if (t.dueDate) arr.push(new Date(t.dueDate));
      return arr;
    });

    const minDate = addDays(min(dates), -3);
    const maxDate = addDays(max(dates), 7);

    const colors = {};
    projects?.forEach((p, i) => {
      colors[p._id] = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#6366f1'][i % 6];
    });

    return {
      timelineStart: startDate || minDate,
      timelineEnd: addDays(timelineStart, daysToShow),
      allDays: eachDayOfInterval({ start: timelineStart, end: addDays(timelineStart, daysToShow) }),
      projectColors: colors
    };
  }, [tasks, projects, startDate, daysToShow]);

  const goToPrev = () => setStartDate(addDays(timelineStart, -daysToShow));
  const goToNext = () => setStartDate(addDays(timelineStart, daysToShow));

  const getTaskPosition = (task) => {
    const createdAt = task.createdAt ? new Date(task.createdAt) : new Date();
    const dueDate = task.dueDate ? new Date(task.dueDate) : addDays(createdAt, 7);

    const startOffset = Math.max(0, differenceInDays(createdAt, timelineStart));
    const duration = Math.max(1, differenceInDays(dueDate, createdAt));
    const endOffset = Math.min(daysToShow - 1, startOffset + duration);

    return {
      left: `${(startOffset / daysToShow) * 100}%`,
      width: `${Math.max(5, ((endOffset - startOffset) / daysToShow) * 100)}%`
    };
  };

  const groupedTasks = useMemo(() => {
    const groups = {};
    tasks.filter(t => !t.isSubtask).forEach(task => {
      const projectId = task.projectId?._id || task.projectId;
      if (!groups[projectId]) {
        groups[projectId] = {
          project: projects?.find(p => p._id === projectId) || { title: 'Unassigned', _id: projectId },
          tasks: []
        };
      }
      groups[projectId].tasks.push(task);
    });
    return Object.values(groups);
  }, [tasks, projects]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={goToPrev} className="p-2 hover:bg-dark-700 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium min-w-[200px] text-center">
            {format(timelineStart, 'MMM d')} - {format(addDays(timelineStart, daysToShow), 'MMM d, yyyy')}
          </span>
          <button onClick={goToNext} className="p-2 hover:bg-dark-700 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-dark-400">Show:</span>
          <select
            value={daysToShow}
            onChange={(e) => setDaysToShow(Number(e.target.value))}
            className="input-field py-1 text-sm"
          >
            <option value={14}>2 weeks</option>
            <option value={30}>1 month</option>
            <option value={60}>2 months</option>
            <option value={90}>3 months</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto" ref={containerRef}>
          <div className="min-w-[800px]">
            <div className="flex border-b border-dark-700">
              <div className="w-64 flex-shrink-0 p-3 bg-dark-800 border-r border-dark-700 font-medium text-sm">
                Task
              </div>
              <div className="flex-1 flex">
                {allDays.filter((_, i) => i % 7 === 0).map((day, i) => (
                  <div
                    key={i}
                    className="flex-1 text-center text-xs text-dark-400 py-2 border-l border-dark-700"
                  >
                    {format(day, 'MMM d')}
                  </div>
                ))}
              </div>
            </div>

            {groupedTasks.map((group) => (
              <div key={group.project._id} className="border-b border-dark-700">
                <div className="flex items-center gap-2 p-3 bg-dark-800/50 border-b border-dark-700">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: projectColors[group.project._id] || '#64748b' }}
                  />
                  <span className="font-medium text-sm">{group.project.title}</span>
                  <span className="text-xs text-dark-400">({group.tasks.length} tasks)</span>
                </div>

                {group.tasks.map((task, idx) => {
                  const pos = getTaskPosition(task);
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

                  return (
                    <motion.div
                      key={task._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center hover:bg-dark-700/30 transition-colors"
                    >
                      <div className="w-64 flex-shrink-0 p-3 border-r border-dark-700">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                          <span className="text-sm truncate cursor-pointer hover:text-primary-400" onClick={() => onTaskClick?.(task)}>
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-dark-400">
                          {task.assignedTo && (
                            <img src={task.assignedTo.avatar} className="w-4 h-4 rounded-full" alt="" />
                          )}
                          <span>{task.status.replace('-', ' ')}</span>
                        </div>
                      </div>

                      <div className="flex-1 relative h-12">
                        <div
                          onClick={() => onTaskClick?.(task)}
                          className={`
                            absolute top-2 h-8 rounded-lg cursor-pointer hover:opacity-80 transition-opacity flex items-center px-2
                            ${statusColors[task.status]} bg-opacity-80
                          `}
                          style={{
                            left: pos.left,
                            width: pos.width,
                            backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.3)' : undefined
                          }}
                        >
                          <span className="text-xs text-white truncate">{task.title}</span>
                        </div>

                        <div className="absolute top-0 left-0 right-0 h-px bg-dark-700/50" />
                        {allDays.filter((_, i) => i % 7 === 0).map((day, i) => (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 w-px bg-dark-700"
                            style={{ left: `${((i + 1) * 7) / daysToShow * 100}%` }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-slate-500" />
          <span className="text-dark-400">To Do</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-dark-400">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-dark-400">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500/50" />
          <span className="text-dark-400">Overdue</span>
        </div>
      </div>
    </div>
  );
}