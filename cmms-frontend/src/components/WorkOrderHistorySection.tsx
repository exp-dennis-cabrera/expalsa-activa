import { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import { workOrderExtrasApi, type WorkOrderHistoryEntry } from '../api/workOrderExtras';

interface Props {
  workOrderId: number;
}

/**
 * Igual proposito que la seccion de historial real: quien cambio que y
 * cuando, para poder auditar una orden despues.
 */
export default function WorkOrderHistorySection({ workOrderId }: Props) {
  const [entries, setEntries] = useState<WorkOrderHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workOrderExtrasApi
      .history(workOrderId)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [workOrderId]);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Historial de cambios
      </Typography>
      {loading ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Cargando…
        </Typography>
      ) : entries.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Todavía no hay cambios registrados en esta orden.
        </Typography>
      ) : (
        <List dense disablePadding>
          {entries.map((entry) => (
            <ListItem key={entry.id} disableGutters sx={{ py: 0.25 }}>
              <ListItemText
                primary={entry.name}
                secondary={`${entry.userName ?? 'Alguien'} — ${new Date(entry.createdAt).toLocaleString()}`}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
