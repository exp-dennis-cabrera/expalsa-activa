import { useEffect, useState } from 'react';
import { Box, Typography, Paper, TextField, MenuItem, Button, IconButton, Table, TableHead, TableBody, TableRow, TableCell, Checkbox, FormControlLabel, Stack } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import { customFieldsApi, type CustomField, type CustomFieldType, type CustomFieldEntityType } from '../api/customFields';

const TYPE_LABELS: Record<CustomFieldType, string> = {
  TEXT: 'Texto',
  NUMBER: 'Número',
  DATE: 'Fecha',
  SELECT: 'Lista de opciones',
  CHECKBOX: 'Casilla',
};

const ENTITY_LABELS: Record<CustomFieldEntityType, string> = {
  WORK_ORDER: 'Orden de trabajo',
  PREVENTIVE_MAINTENANCE: 'Mantenimiento preventivo',
  ASSET: 'Activo',
};

export default function CustomFieldsSettingsTab() {
  const [entityType, setEntityType] = useState<CustomFieldEntityType>('WORK_ORDER');
  const [fields, setFields] = useState<CustomField[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<CustomFieldType>('TEXT');
  const [required, setRequired] = useState(false);
  const [copyOnGenerate, setCopyOnGenerate] = useState(true);
  const [optionsText, setOptionsText] = useState('');

  async function load() {
    setFields(await customFieldsApi.list(entityType));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType]);

  async function handleCreate() {
    if (!name.trim()) return;
    await customFieldsApi.create({
      name: name.trim(),
      type,
      entityType,
      required,
      copyOnGenerate,
      options: type === 'SELECT' ? optionsText.split(',').map((o) => o.trim()).filter(Boolean) : [],
    });
    setName('');
    setOptionsText('');
    setRequired(false);
    setCopyOnGenerate(true);
    load();
  }

  async function handleDelete(id: number) {
    await customFieldsApi.delete(id);
    load();
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 700 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
        Campos personalizados
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Agrega campos extra a Órdenes de trabajo o Mantenimiento Preventivo. Si marcas "Copiar al generar", el
        valor puesto en un Mantenimiento Preventivo se copia automáticamente a cada orden que genera.
      </Typography>

      <TextField
        select
        size="small"
        label="Tipo de entidad"
        value={entityType}
        onChange={(e) => setEntityType(e.target.value as CustomFieldEntityType)}
        sx={{ mb: 2, width: 260 }}
      >
        {Object.entries(ENTITY_LABELS).map(([value, label]) => (
          <MenuItem key={value} value={value}>
            {label}
          </MenuItem>
        ))}
      </TextField>

      <Table size="small" sx={{ mb: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Requerido</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.map((f) => (
            <TableRow key={f.id}>
              <TableCell>{f.name}</TableCell>
              <TableCell>{TYPE_LABELS[f.type]}</TableCell>
              <TableCell>{f.required ? 'Sí' : 'No'}</TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => handleDelete(f.id)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {fields.length === 0 && (
            <TableRow>
              <TableCell colSpan={4}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Sin campos personalizados para {ENTITY_LABELS[entityType].toLowerCase()}.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Agregar campo
      </Typography>
      <Stack spacing={1.5}>
        <TextField size="small" label="Nombre" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
        <TextField select size="small" label="Tipo" value={type} onChange={(e) => setType(e.target.value as CustomFieldType)} fullWidth>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        {type === 'SELECT' && (
          <TextField
            size="small"
            label="Opciones (separadas por coma)"
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            fullWidth
          />
        )}
        <FormControlLabel control={<Checkbox checked={required} onChange={(e) => setRequired(e.target.checked)} />} label="Requerido" />
        {entityType === 'PREVENTIVE_MAINTENANCE' && (
          <FormControlLabel
            control={<Checkbox checked={copyOnGenerate} onChange={(e) => setCopyOnGenerate(e.target.checked)} />}
            label="Copiar valor a cada orden generada"
          />
        )}
        <Button variant="contained" onClick={handleCreate} sx={{ alignSelf: 'flex-start' }}>
          Agregar campo
        </Button>
      </Stack>
    </Paper>
  );
}
