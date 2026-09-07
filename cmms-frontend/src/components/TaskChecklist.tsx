import { useEffect, useState } from 'react';
import { Box, Typography, TextField, IconButton, MenuItem, Checkbox, Stack, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import { tasksApi, type TaskItem, type TaskType } from '../api/tasks';

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  TEXT: 'Texto',
  NUMBER: 'Número',
  CHECKBOX: 'Casilla',
  METER: 'Medidor',
};

interface Props {
  entityType: 'work-orders' | 'preventive-maintenances';
  entityId: number;
  isTemplate: boolean;
}

export default function TaskChecklist({ entityType, entityId, isTemplate }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<TaskType>('TEXT');

  async function load() {
    const list = entityType === 'work-orders' ? await tasksApi.listForWorkOrder(entityId) : await tasksApi.listForPM(entityId);
    setTasks(list);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  async function handleAdd() {
    if (!newLabel.trim()) return;
    if (entityType === 'work-orders') {
      await tasksApi.createForWorkOrder(entityId, newLabel.trim(), newType);
    } else {
      await tasksApi.createForPM(entityId, newLabel.trim(), newType);
    }
    setNewLabel('');
    load();
  }

  async function handleDelete(taskId: number) {
    await tasksApi.delete(taskId);
    load();
  }

  async function handleValueChange(task: TaskItem, value: string) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, value } : t)));
    await tasksApi.updateValue(task.id, value, undefined);
  }

  async function handleToggleCompleted(task: TaskItem) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
    await tasksApi.updateValue(task.id, undefined, !task.completed);
  }

  return (
    <Box>
      <Stack spacing={1}>
        {tasks.map((task) => (
          <Box key={task.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isTemplate ? (
              <Typography variant="body2" sx={{ flex: 1 }}>
                {task.label}{' '}
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
                  ({TASK_TYPE_LABELS[task.type]})
                </Typography>
              </Typography>
            ) : (
              <>
                <Checkbox checked={task.completed} onChange={() => handleToggleCompleted(task)} size="small" />
                <Typography variant="body2" sx={{ width: 160, flexShrink: 0 }}>
                  {task.label}
                </Typography>
                {task.type !== 'CHECKBOX' && (
                  <TextField
                    size="small"
                    type={task.type === 'NUMBER' || task.type === 'METER' ? 'number' : 'text'}
                    value={task.value ?? ''}
                    onChange={(e) => handleValueChange(task, e.target.value)}
                    fullWidth
                  />
                )}
              </>
            )}
            {isTemplate && (
              <IconButton size="small" onClick={() => handleDelete(task.id)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        ))}
        {tasks.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Sin tareas todavía.
          </Typography>
        )}
      </Stack>

      {isTemplate && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
          <TextField size="small" placeholder="Nueva tarea…" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} fullWidth />
          <TextField select size="small" value={newType} onChange={(e) => setNewType(e.target.value as TaskType)} sx={{ width: 130 }}>
            {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <Button size="small" startIcon={<AddIcon />} onClick={handleAdd}>
            Agregar
          </Button>
        </Box>
      )}
    </Box>
  );
}
