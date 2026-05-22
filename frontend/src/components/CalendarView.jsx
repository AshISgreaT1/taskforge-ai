import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

const priorityColors = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
};

export default function CalendarView({ tasks, onTaskClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(task);
      }
    });
    return map;
  }, [tasks]);

  const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const selectedDateTasks = selectedDate ? tasksByDate[format(selectedDate, 'yyyy-MM-dd')] || [] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPrevMonth}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold min-w-[180px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="btn-secondary text-sm"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            className="text-center text-sm font-medium text-dark-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <motion.button
              key={idx}
              onClick={() => setSelectedDate(day)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                min-h-[100px] p-2 rounded-lg text-left transition-colors relative
                ${!isCurrentMonth ? 'bg-dark-800/30 text-dark-500' : 'bg-dark-800/50'}
                ${isSelected ? 'ring-2 ring-primary-500' : ''}
                ${isToday(day) ? 'bg-primary-600/20' : ''}
              `}
            >
              <span className={`text-sm ${isToday(day) ? 'font-bold text-primary-400' : ''}`}>
                {format(day, 'd')}
              </span>

              {dayTasks.length > 0 && (
                <div className="mt-1 space-y-1">
                  {dayTasks.slice(0, 3).map(task => (
                    <div
                      key={task._id}
                      onClick={(e) => { e.stopPropagation(); onTaskClick?.(task); }}
                      className={`
                        text-xs p-1 rounded truncate cursor-pointer hover:opacity-80
                        ${priorityColors[task.priority]} bg-opacity-20
                      `}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-dark-400 text-center">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="card p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="w-5 h-5 text-primary-400" />
              <h4 className="font-semibold">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h4>
            </div>
            {selectedDateTasks.length > 0 ? (
              <div className="space-y-2">
                {selectedDateTasks.map(task => (
                  <div
                    key={task._id}
                    onClick={() => onTaskClick?.(task)}
                    className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg cursor-pointer hover:bg-dark-700 transition-colors"
                  >
                    <div className={`w-3 h-3 rounded-full ${priorityColors[task.priority]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      <p className="text-sm text-dark-400">{task.projectId?.title}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      task.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-400 text-center py-4">No tasks due on this date</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}