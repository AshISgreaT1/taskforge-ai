import { useState } from 'react';
import { DndContext, closestCenter, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, MoreVertical, Calendar } from 'lucide-react';

const columns = [
  { id: 'todo', title: 'To Do', color: 'border-slate-500', bg: 'bg-slate-500/10' },
  { id: 'in-progress', title: 'In Progress', color: 'border-blue-500', bg: 'bg-blue-500/10' },
  { id: 'pending-approval', title: 'Pending Approval', color: 'border-amber-500', bg: 'bg-amber-500/10' },
  { id: 'completed', title: 'Completed', color: 'border-green-500', bg: 'bg-green-500/10' }
];

const priorityColors = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
};

function SortableTaskCard({ task, onStatusChange, onDelete, onEdit, canDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="card p-4 group"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 p-1 opacity-0 group-hover:opacity-100 hover:bg-dark-700 rounded cursor-grab active:cursor-grabbing transition-opacity"
        >
          <GripVertical className="w-4 h-4 text-dark-400" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm truncate">{task.title}</h4>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-dark-700 rounded transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 bg-dark-700 rounded-lg shadow-lg py-1 z-20 min-w-[140px]"
                  >
                    <button
                      onClick={() => { onEdit(task); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-sm hover:bg-dark-600 text-left"
                    >
                      Edit
                    </button>
                    <select
                      value={task.status}
                      onChange={(e) => { onStatusChange(task._id, e.target.value); setShowMenu(false); }}
                      className="w-full px-3 py-2 bg-transparent text-sm hover:bg-dark-600 text-left"
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="pending-approval">Pending Approval</option>
                      <option value="completed">Completed</option>
                    </select>
                    {canDelete && (
                      <button
                        onClick={() => { onDelete(task._id); setShowMenu(false); }}
                        className="w-full px-3 py-2 text-sm hover:bg-dark-600 text-left text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-dark-400 mt-1 line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
              <span className="text-xs text-dark-400 capitalize">{task.priority}</span>
            </div>

            {task.dueDate && (
              <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-400' : 'text-dark-400'}`}>
                <Calendar className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString()}
              </div>
            )}

            {task.assignedTo && (
              <img
                src={task.assignedTo.avatar}
                alt={task.assignedTo.name}
                className="w-5 h-5 rounded-full"
                title={task.assignedTo.name}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KanbanBoard({ tasks, onStatusChange, onDelete, onEdit, onTaskDrop, canDelete = true }) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor)
  );

  const tasksByStatus = {
    'todo': tasks.filter(t => t.status === 'todo' && !t.isSubtask),
    'in-progress': tasks.filter(t => t.status === 'in-progress' && !t.isSubtask),
    'pending-approval': tasks.filter(t => t.status === 'pending-approval' && !t.isSubtask),
    'completed': tasks.filter(t => t.status === 'completed' && !t.isSubtask)
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = tasks.find(t => t._id === active.id);
    if (!activeTask) return;

    let newStatus = null;

    for (const col of columns) {
      const columnTasks = tasksByStatus[col.id];
      if (columnTasks.some(t => t._id === over.id)) {
        newStatus = col.id;
        break;
      }
    }

    if (!newStatus && over.id.startsWith('column-')) {
      newStatus = over.id.replace('column-', '');
    }

    if (newStatus && newStatus !== activeTask.status) {
      onStatusChange(activeTask._id, newStatus);
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t._id === active.id);
    if (!activeTask) return;

    let overStatus = null;

    for (const col of columns) {
      const columnTasks = tasksByStatus[col.id];
      if (columnTasks.some(t => t._id === over.id)) {
        overStatus = col.id;
        break;
      }
    }

    if (!overStatus && over.id.startsWith('column-')) {
      overStatus = over.id.replace('column-', '');
    }

    if (overStatus && overStatus !== activeTask.status) {
      onStatusChange(activeTask._id, overStatus);
    }
  };

  const activeTask = activeId ? tasks.find(t => t._id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {columns.map((column) => (
          <div
            key={column.id}
            id={`column-${column.id}`}
            className={`border-t-2 ${column.color} rounded-xl p-4 bg-dark-800/30 min-h-[200px]`}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${column.color.replace('border-', 'bg-')}`} />
              <h3 className="font-semibold">{column.title}</h3>
              <span className="text-sm text-dark-400">({tasksByStatus[column.id].length})</span>
            </div>

            <SortableContext
              items={tasksByStatus[column.id].map(t => t._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {tasksByStatus[column.id].map((task) => (
                  <SortableTaskCard
                    key={task._id}
                    task={task}
                    onStatusChange={onStatusChange}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    canDelete={canDelete}
                  />
                ))}
                {tasksByStatus[column.id].length === 0 && (
                  <div className="text-center py-8 text-dark-400 text-sm">
                    Drop tasks here
                  </div>
                )}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="card p-4 opacity-80 rotate-3">
            <h4 className="font-medium text-sm">{activeTask.title}</h4>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
