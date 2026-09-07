import { Box, FormControl, MenuItem, Select, useTheme } from '@mui/material';
import type { SelectChangeEvent, Theme } from '@mui/material';
import type { AssetResponse } from '../types';

type AssetStatus = AssetResponse['status'];

/**
 * Copia fiel de assetStatuses de models/owns/asset.ts de Atlas CMMS
 * (commit 44069b69): los 7 estados en su orden, con sus colores exactos.
 */
export const assetStatuses: { status: AssetStatus; color: (t: Theme) => string; label: string }[] = [
  { status: 'OPERATIONAL', color: (t) => t.palette.success.main, label: 'Operativo' },
  { status: 'MODERNIZATION', color: () => '#CBC3E3', label: 'Modernización' },
  { status: 'DOWN', color: (t) => t.palette.error.main, label: 'Fuera de servicio' },
  { status: 'STANDBY', color: (t) => t.palette.primary.main, label: 'En espera' },
  { status: 'INSPECTION_SCHEDULED', color: (t) => t.palette.warning.main, label: 'Inspección programada' },
  { status: 'COMMISSIONING', color: () => '#808080', label: 'Puesta en marcha' },
  { status: 'EMERGENCY_SHUTDOWN', color: (t) => t.palette.error.dark, label: 'Apagado de emergencia' },
];

interface PropsType {
  value: AssetStatus;
  onChange: (status: AssetStatus) => void;
  disabled?: boolean;
}

/** Copia fiel de AssetStatusSelect.tsx real. */
export default function AssetStatusSelect({ value, onChange, disabled }: PropsType) {
  const theme = useTheme();

  const getColor = (status: AssetStatus) =>
    assetStatuses.find((s) => s.status === status)?.color(theme) ?? 'grey';

  const getLabel = (status: AssetStatus) =>
    assetStatuses.find((s) => s.status === status)?.label ?? status;

  return (
    <FormControl size="small">
      <Select
        value={value}
        onChange={(event: SelectChangeEvent) => onChange(event.target.value as AssetStatus)}
        disabled={disabled}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: getColor(selected as AssetStatus),
              }}
            />
            {getLabel(selected as AssetStatus)}
          </Box>
        )}
      >
        {assetStatuses.map(({ status }) => (
          <MenuItem key={status} value={status}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: getColor(status) }}
              />
              {getLabel(status)}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
