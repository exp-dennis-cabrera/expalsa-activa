import { Checkbox, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { PermissionEntity, RoleResponse } from '../api/roles';

type PermissionRoot = 'viewPermissions' | 'viewOtherPermissions' | 'createPermissions' | 'editOtherPermissions' | 'deleteOtherPermissions';

const PERMISSION_ROOTS: PermissionRoot[] = ['viewPermissions', 'viewOtherPermissions', 'createPermissions', 'editOtherPermissions', 'deleteOtherPermissions'];

const ALL_ENTITIES: PermissionEntity[] = [
  'PEOPLE_AND_TEAMS',
  'CATEGORIES',
  'CATEGORIES_WEB',
  'WORK_ORDERS',
  'PREVENTIVE_MAINTENANCES',
  'ASSETS',
  'PARTS_AND_MULTIPARTS',
  'PURCHASE_ORDERS',
  'METERS',
  'VENDORS_AND_CUSTOMERS',
  'FILES',
  'LOCATIONS',
  'SETTINGS',
  'REQUESTS',
  'ANALYTICS',
];

const ENTITY_LABELS: Record<PermissionEntity, string> = {
  PEOPLE_AND_TEAMS: 'Personas y equipos',
  CATEGORIES: 'Categorías',
  CATEGORIES_WEB: 'Categorías (web)',
  WORK_ORDERS: 'Órdenes de trabajo',
  PREVENTIVE_MAINTENANCES: 'Mantenimiento preventivo',
  ASSETS: 'Activos',
  PARTS_AND_MULTIPARTS: 'Repuestos y sets',
  PURCHASE_ORDERS: 'Órdenes de compra',
  METERS: 'Medidores',
  VENDORS_AND_CUSTOMERS: 'Proveedores y clientes',
  FILES: 'Archivos',
  LOCATIONS: 'Ubicaciones',
  SETTINGS: 'Ajustes',
  REQUESTS: 'Solicitudes',
  ANALYTICS: 'Analítica',
};

interface Props {
  values: Record<PermissionRoot, PermissionEntity[]>;
  onChange?: (root: PermissionRoot, entity: PermissionEntity, checked: boolean) => void;
  disabled?: boolean;
}

// Copia fiel de PermissionsMatrix.tsx real: 15 entidades en filas, 5
// columnas (Ver, Ver de otros, Crear, Editar, Eliminar). Sin onChange,
// funciona en modo de solo lectura (igual que RoleDetails.tsx real, que
// la usa pasando solo "role" sin handleChange).
export default function PermissionsMatrix({ values, onChange, disabled }: Props) {
  const isEditable = !!onChange && !disabled;
  function isChecked(root: PermissionRoot, entity: PermissionEntity): boolean {
    return values[root]?.includes(entity) ?? false;
  }

  return (
    <>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        "Ver de otros" permite ver los registros de otros usuarios, no solo los propios.
      </Typography>
      <TableContainer component={Paper} sx={{ maxHeight: 400 }} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }} />
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ver</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ver de otros</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Crear</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Editar</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Eliminar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ALL_ENTITIES.map((entity) => (
              <TableRow key={entity}>
                <TableCell sx={{ fontWeight: 'bold' }}>{ENTITY_LABELS[entity]}</TableCell>
                {PERMISSION_ROOTS.map((root) => (
                  <TableCell key={root} align="center">
                    <Checkbox
                      checked={isChecked(root, entity)}
                      disabled={!isEditable}
                      onChange={isEditable ? (e) => onChange!(root, entity, e.target.checked) : undefined}
                      size="small"
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
