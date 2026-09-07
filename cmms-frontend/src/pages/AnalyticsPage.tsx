import { useState } from 'react';
import { Box, List, ListItemButton, ListItemText, ListSubheader, Paper, Typography, Chip } from '@mui/material';
import WorkOrderStatusReport from '../components/analytics/WorkOrderStatusReport';

interface ReportDef {
  key: string;
  label: string;
  ready: boolean;
}

interface CategoryDef {
  label: string;
  reports: ReportDef[];
}

const CATEGORIES: CategoryDef[] = [
  {
    label: 'Órdenes de trabajo',
    reports: [
      { key: 'wo-status', label: 'Informe de estado', ready: true },
      { key: 'wo-analysis', label: 'Análisis de OT', ready: false },
      { key: 'wo-aging', label: 'Antigüedad de OT', ready: false },
      { key: 'wo-time-cost', label: 'Tiempo y costo', ready: false },
    ],
  },
  {
    label: 'Activos',
    reports: [
      { key: 'asset-reliability', label: 'Panel de confiabilidad', ready: false },
      { key: 'asset-cost', label: 'Costo total de mantenimiento', ready: false },
    ],
  },
  {
    label: 'Repuestos',
    reports: [{ key: 'parts-consumption', label: 'Consumo de repuestos', ready: false }],
  },
  {
    label: 'Solicitudes',
    reports: [{ key: 'requests-analysis', label: 'Análisis de solicitudes', ready: false }],
  },
];

export default function AnalyticsPage() {
  const [selected, setSelected] = useState('wo-status');

  const currentReport = CATEGORIES.flatMap((c) => c.reports).find((r) => r.key === selected);

  return (
    <>
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        <Paper variant="outlined" sx={{ width: 260, flexShrink: 0 }}>
          <List disablePadding>
            {CATEGORIES.map((cat) => (
              <List
                key={cat.label}
                disablePadding
                subheader={
                  <ListSubheader sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {cat.label}
                  </ListSubheader>
                }
              >
                {cat.reports.map((r) => (
                  <ListItemButton key={r.key} selected={selected === r.key} onClick={() => setSelected(r.key)}>
                    <ListItemText primary={r.label} primaryTypographyProps={{ fontSize: 13.5 }} />
                    {!r.ready && <Chip label="Próximamente" size="small" variant="outlined" sx={{ height: 20, fontSize: 10.5 }} />}
                  </ListItemButton>
                ))}
              </List>
            ))}
          </List>
        </Paper>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {selected === 'wo-status' && <WorkOrderStatusReport />}
          {currentReport && !currentReport.ready && (
            <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
              <Typography sx={{ color: 'text.secondary' }}>
                "{currentReport.label}" todavía no está construido — vamos por partes, uno por vez.
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </>
  );
}
