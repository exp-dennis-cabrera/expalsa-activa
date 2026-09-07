import { useEffect, useState } from 'react';
import {
  Grid, Typography, Button, Stack, TextField, MenuItem, Autocomplete, FormControlLabel, Switch,
} from '@mui/material';

import { filterSingleField, type FilterFieldType, type SearchOperator } from '../utils/filter';
import type { FilterField } from '../models/searchCriteria';
import { useDispatch, useSelector } from '../store';
import { getUsersMini } from '../slices/user';
import { getTeamsMini } from '../slices/team';
import { getCategories } from '../slices/category';
import { assetsApi } from '../api/assets';
import { locationsApi } from '../api/locations';
import type { AssetResponse, LocationSummary } from '../types';

/**
 * Copia del panel MoreFilters de Atlas CMMS (commit 44069b69).
 *
 * Se conserva su filtersConfig con los mismos campos y operadores, y la
 * traduccion por filterSingleField. El original arma los campos con un
 * componente Form generico que no existe aca, asi que se dibujan directo
 * -- el resultado enviado al backend es identico.
 */
interface Props {
  filterFields: FilterField[];
  onFilterChange: (filterFields: FilterField[]) => void;
  onClose: () => void;
}

/** Copia fiel de filtersConfig real. */
const filtersConfig: {
  accessor: string;
  fieldName: string;
  operator?: SearchOperator;
  type: FilterFieldType;
}[] = [
  { accessor: 'assets', fieldName: 'asset', type: 'array' },
  { accessor: 'categories', fieldName: 'category', type: 'array' },
  { accessor: 'teams', fieldName: 'team', type: 'array' },
  { accessor: 'primaryUsers', fieldName: 'primaryAssignee', type: 'array' },
  { accessor: 'locations', fieldName: 'location', type: 'array' },
  { accessor: 'createdBy', fieldName: 'createdBy', type: 'array' },
  { accessor: 'completedBy', fieldName: 'completedBy', type: 'array' },
  { accessor: 'assignedTo', fieldName: 'assignees', operator: 'inm', type: 'array' },
  { accessor: 'archived', fieldName: 'archived', type: 'simple' },
  { accessor: 'createdAt', fieldName: 'createdAt', type: 'date' },
  { accessor: 'dueDate', fieldName: 'dueDate', type: 'dateLessThan' },
  { accessor: 'updatedAt', fieldName: 'updatedAt', type: 'date' },
  { accessor: 'completedOn', fieldName: 'completedAt', type: 'date' },
];

type Opcion = { label: string; value: number };

export default function WorkOrderMoreFilters({ filterFields, onFilterChange, onClose }: Props) {
  const dispatch = useDispatch();
  const { usersMini } = useSelector((state) => state.users);
  const { teamsMini } = useSelector((state) => state.teams);
  const categoriesByType = useSelector((state) => state.categories.categories);
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [locations, setLocations] = useState<LocationSummary[]>([]);

  const [values, setValues] = useState<Record<string, any>>({
    assets: [], categories: [], teams: [], primaryUsers: [], locations: [],
    createdBy: [], completedBy: [], assignedTo: [],
    archived: false, type: 'ALL',
    createdAt: [null, null], updatedAt: [null, null], completedOn: [null, null], dueDate: null,
  });

  useEffect(() => {
    dispatch(getUsersMini());
    dispatch(getTeamsMini());
    dispatch(getCategories('WORK_ORDER'));
    assetsApi.list({ size: 200 }).then((r) => setAssets(r.content)).catch(() => setAssets([]));
    locationsApi.list().then(setLocations).catch(() => setLocations([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usuarios: Opcion[] = usersMini.map((u) => ({ label: u.fullName, value: u.id }));
  const equipos: Opcion[] = teamsMini.map((t) => ({ label: t.name, value: t.id }));
  const categorias: Opcion[] = (categoriesByType['WORK_ORDER'] ?? []).map((c) => ({ label: c.name, value: c.id }));
  const activos: Opcion[] = assets.map((a) => ({ label: a.name, value: a.id }));
  const ubicaciones: Opcion[] = locations.map((l) => ({ label: l.name, value: l.id }));

  function set(campo: string, valor: unknown) {
    setValues((prev) => ({ ...prev, [campo]: valor }));
  }

  function handleReset() {
    onFilterChange([]);
    onClose();
  }

  /** Copia fiel del onSubmit real: recorre filtersConfig y traduce cada filtro. */
  function handleSubmit() {
    let newFilters = [...filterFields];
    filtersConfig.forEach((filterConfig) => {
      newFilters = filterSingleField(
        newFilters, values, filterConfig.accessor, filterConfig.fieldName,
        filterConfig.type, filterConfig.operator
      );
    });

    // Filtro de tipo: reactivo = sin preventivo padre, repetitivo = con el.
    newFilters = newFilters.filter(({ field }) => field !== 'parentPreventiveMaintenance');
    if (values.type === 'REACTIVE') {
      newFilters.push({ field: 'parentPreventiveMaintenance', operation: 'nu', value: '' });
    } else if (values.type === 'REPEATING') {
      newFilters.push({ field: 'parentPreventiveMaintenance', operation: 'nn', value: '' });
    }

    onFilterChange(newFilters);
    onClose();
  }

  function selectorMultiple(campo: string, etiqueta: string, opciones: Opcion[]) {
    return (
      <Autocomplete
        multiple
        size="small"
        options={opciones}
        value={values[campo] ?? []}
        onChange={(_, v) => set(campo, v)}
        isOptionEqualToValue={(o, v) => o.value === v.value}
        renderInput={(params) => <TextField {...params} label={etiqueta} />}
      />
    );
  }

  function rangoFechas(campo: string, etiqueta: string) {
    const [desde, hasta] = values[campo] ?? [null, null];
    return (
      <Stack direction="row" spacing={1}>
        <TextField
          size="small" type="date" label={`${etiqueta} desde`} fullWidth
          InputLabelProps={{ shrink: true }}
          value={desde ?? ''}
          onChange={(e) => set(campo, [e.target.value || null, hasta])}
        />
        <TextField
          size="small" type="date" label={`${etiqueta} hasta`} fullWidth
          InputLabelProps={{ shrink: true }}
          value={hasta ?? ''}
          onChange={(e) => set(campo, [desde, e.target.value || null])}
        />
      </Stack>
    );
  }

  return (
    <Grid container justifyContent="center" alignItems="stretch" spacing={2} padding={2}>
      <Grid item xs={12}>
        <Typography variant="h2">Más filtros</Typography>
      </Grid>

      <Grid item xs={12}>
        <TextField
          select size="small" label="Tipo" fullWidth
          value={values.type}
          onChange={(e) => set('type', e.target.value)}
        >
          <MenuItem value="ALL">Todas</MenuItem>
          <MenuItem value="REACTIVE">Reactivas</MenuItem>
          <MenuItem value="REPEATING">Repetitivas</MenuItem>
        </TextField>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Personas</Typography>
        <Stack spacing={2}>
          {selectorMultiple('primaryUsers', 'Trabajador principal', usuarios)}
          {selectorMultiple('assignedTo', 'Trabajadores adicionales', usuarios)}
          {selectorMultiple('teams', 'Equipos', equipos)}
          {selectorMultiple('createdBy', 'Creado por', usuarios)}
          {selectorMultiple('completedBy', 'Completado por', usuarios)}
        </Stack>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Recursos</Typography>
        <Stack spacing={2}>
          {selectorMultiple('assets', 'Activos', activos)}
          {selectorMultiple('locations', 'Ubicaciones', ubicaciones)}
          {selectorMultiple('categories', 'Categorías', categorias)}
        </Stack>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Fechas</Typography>
        <Stack spacing={2}>
          {rangoFechas('createdAt', 'Creación')}
          {rangoFechas('updatedAt', 'Actualización')}
          {rangoFechas('completedOn', 'Completada')}
          <TextField
            size="small" type="date" label="Vence antes de" fullWidth
            InputLabelProps={{ shrink: true }}
            value={values.dueDate ?? ''}
            onChange={(e) => set('dueDate', e.target.value || null)}
          />
        </Stack>
      </Grid>

      <Grid item xs={12}>
        <FormControlLabel
          control={<Switch checked={!!values.archived} onChange={(e) => set('archived', e.target.checked)} />}
          label="Archivadas"
        />
      </Grid>

      <Grid item xs={12}>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={handleSubmit}>Guardar</Button>
          <Button variant="outlined" onClick={handleReset}>Restablecer</Button>
        </Stack>
      </Grid>
    </Grid>
  );
}
