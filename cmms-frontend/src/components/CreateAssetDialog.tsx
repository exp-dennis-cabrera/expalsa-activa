import { useEffect, useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  Alert,
  Divider,
} from '@mui/material';
import { assetsApi, type AssetPayload } from '../api/assets';
import { locationsApi } from '../api/locations';
import { categoriesApi } from '../api/categories';
import { usersApi, type UserMini } from '../api/users';
import { teamsApi, type TeamMiniResponse } from '../api/teams';
import { vendorsApi } from '../api/vendors';
import { partsApi } from '../api/parts';
import type { AssetResponse, AssetStatus, CategorySummary, LocationSummary, VendorSummary, PartSummary } from '../types';
import { ApiRequestError } from '../api/client';
import ConfirmDialog from './ConfirmDialog';
import { ASSET_STATUS_LABELS, ASSET_STATUS_ORDER } from '../constants';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editAsset?: AssetResponse | null;
  allAssets: AssetResponse[]; // para elegir activo padre
}

export default function CreateAssetDialog({ open, onClose, onSaved, editAsset, allAssets }: Props) {
  const isEditMode = !!editAsset;

  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [users, setUsers] = useState<UserMini[]>([]);
  const [teams, setTeams] = useState<TeamMiniResponse[]>([]);
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [parts, setParts] = useState<PartSummary[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<AssetStatus>('OPERATIONAL');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [parentAssetId, setParentAssetId] = useState('');
  const [primaryUserId, setPrimaryUserId] = useState('');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [vendorIds, setVendorIds] = useState<string[]>([]);
  const [partIds, setPartIds] = useState<string[]>([]);

  const [serialNumber, setSerialNumber] = useState('');
  const [model, setModel] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [power, setPower] = useState('');
  const [area, setArea] = useState('');
  const [barCode, setBarCode] = useState('');
  const [nfcId, setNfcId] = useState('');

  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [warrantyExpirationDate, setWarrantyExpirationDate] = useState('');
  const [inServiceDate, setInServiceDate] = useState('');
  const [additionalInfos, setAdditionalInfos] = useState('');

  const [purchasePrice, setPurchasePrice] = useState('');
  const [residualValue, setResidualValue] = useState('');
  const [rate, setRate] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDirty(false);
    locationsApi.list().then(setLocations).catch(() => setLocations([]));
    categoriesApi.list('ASSET').then(setCategories).catch(() => setCategories([]));
    usersApi.mini().then(setUsers).catch(() => setUsers([]));
    teamsApi.mini().then(setTeams).catch(() => setTeams([]));
    vendorsApi.list().then(setVendors).catch(() => setVendors([]));
    partsApi.list().then(setParts).catch(() => setParts([]));

    if (editAsset) {
      setName(editAsset.name);
      setDescription(editAsset.description ?? '');
      setStatus(editAsset.status);
      setCategoryId(editAsset.categoryId ? String(editAsset.categoryId) : '');
      setLocationId(editAsset.locationId ? String(editAsset.locationId) : '');
      setParentAssetId(editAsset.parentAssetId ? String(editAsset.parentAssetId) : '');
      setPrimaryUserId(editAsset.primaryUserId ? String(editAsset.primaryUserId) : '');
      setAssignedUserIds(editAsset.assignedUsers.map((u) => String(u.id)));
      setTeamIds(editAsset.teams.map((t) => String(t.id)));
      setVendorIds(editAsset.vendors.map((v) => String(v.id)));
      setPartIds(editAsset.parts.map((p) => String(p.id)));
      setSerialNumber(editAsset.serialNumber ?? '');
      setModel(editAsset.model ?? '');
      setManufacturer(editAsset.manufacturer ?? '');
      setPower(editAsset.power ?? '');
      setArea(editAsset.area ?? '');
      setBarCode(editAsset.barCode ?? '');
      setNfcId(editAsset.nfcId ?? '');
      setAcquisitionDate(editAsset.acquisitionDate ?? '');
      setAcquisitionCost(editAsset.acquisitionCost != null ? String(editAsset.acquisitionCost) : '');
      setWarrantyExpirationDate(editAsset.warrantyExpirationDate ?? '');
      setInServiceDate(editAsset.inServiceDate ?? '');
      setAdditionalInfos(editAsset.additionalInfos ?? '');
      setPurchasePrice(editAsset.deprecation?.purchasePrice != null ? String(editAsset.deprecation.purchasePrice) : '');
      setResidualValue(editAsset.deprecation?.residualValue != null ? String(editAsset.deprecation.residualValue) : '');
      setRate(editAsset.deprecation?.rate != null ? String(editAsset.deprecation.rate) : '');
    } else {
      resetForm();
    }
  }, [open, editAsset]);

  function resetForm() {
    setName('');
    setDescription('');
    setStatus('OPERATIONAL');
    setCategoryId('');
    setLocationId('');
    setParentAssetId('');
    setPrimaryUserId('');
    setAssignedUserIds([]);
    setTeamIds([]);
    setVendorIds([]);
    setPartIds([]);
    setSerialNumber('');
    setModel('');
    setManufacturer('');
    setPower('');
    setArea('');
    setBarCode('');
    setNfcId('');
    setAcquisitionDate('');
    setAcquisitionCost('');
    setWarrantyExpirationDate('');
    setInServiceDate('');
    setAdditionalInfos('');
    setPurchasePrice('');
    setResidualValue('');
    setRate('');
    setError(null);
  }

  function multiSelectChange(setter: (v: string[]) => void) {
    return (e: { target: { value: unknown } }) => {
      const value = e.target.value;
      setter(typeof value === 'string' ? value.split(',') : (value as string[]));
    };
  }

  function handleClose() {
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  }

  function handleDiscardConfirm() {
    setDiscardOpen(false);
    setDirty(false);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const hasDeprecation = purchasePrice || residualValue || rate;
      const payload: AssetPayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        categoryId: categoryId ? Number(categoryId) : undefined,
        locationId: locationId ? Number(locationId) : undefined,
        parentAssetId: parentAssetId ? Number(parentAssetId) : undefined,
        primaryUserId: primaryUserId ? Number(primaryUserId) : undefined,
        assignedUserIds: assignedUserIds.length > 0 ? assignedUserIds.map(Number) : undefined,
        teamIds: teamIds.length > 0 ? teamIds.map(Number) : undefined,
        vendorIds: vendorIds.length > 0 ? vendorIds.map(Number) : undefined,
        partIds: partIds.length > 0 ? partIds.map(Number) : undefined,
        serialNumber: serialNumber || undefined,
        model: model || undefined,
        manufacturer: manufacturer || undefined,
        power: power || undefined,
        area: area || undefined,
        barCode: barCode || undefined,
        nfcId: nfcId || undefined,
        acquisitionDate: acquisitionDate || undefined,
        acquisitionCost: acquisitionCost ? Number(acquisitionCost) : undefined,
        warrantyExpirationDate: warrantyExpirationDate || undefined,
        inServiceDate: inServiceDate || undefined,
        additionalInfos: additionalInfos || undefined,
        deprecation: hasDeprecation
          ? {
              purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
              residualValue: residualValue ? Number(residualValue) : undefined,
              rate: rate ? Number(rate) : undefined,
            }
          : undefined,
      };
      if (isEditMode && editAsset) {
        await assetsApi.update(editAsset.id, payload);
      } else {
        await assetsApi.create(payload);
      }
      setDirty(false);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : `No se pudo ${isEditMode ? 'guardar' : 'crear'} el activo`);
    } finally {
      setSubmitting(false);
    }
  }

  const selectableParents = allAssets.filter((a) => !editAsset || a.id !== editAsset.id);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{isEditMode ? 'Editar activo' : 'Agregar activo'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }} onChange={() => setDirty(true)}>

          <Divider textAlign="left">
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Información
            </Typography>
          </Divider>

          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required fullWidth autoFocus />
            <TextField select label="Ubicación" value={locationId} onChange={(e) => setLocationId(e.target.value)} fullWidth>
              <MenuItem value="">— Ninguna —</MenuItem>
              {locations.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Costo de adquisición"
              type="number"
              value={acquisitionCost}
              onChange={(e) => setAcquisitionCost(e.target.value)}
              fullWidth
            />
          <TextField label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} fullWidth />
            <TextField label="Fabricante" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} fullWidth />
            <TextField label="Potencia" value={power} onChange={(e) => setPower(e.target.value)} fullWidth />
            <TextField label="Modelo" value={model} onChange={(e) => setModel(e.target.value)} fullWidth />
            <TextField label="Código de barras" value={barCode} onChange={(e) => setBarCode(e.target.value)} fullWidth />
            <TextField label="Número de serie" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} fullWidth />
            <TextField select label="Categoría" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} fullWidth>
              <MenuItem value="">— Ninguna —</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Área/zona" value={area} onChange={(e) => setArea(e.target.value)} fullWidth />

          <Divider textAlign="left">
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Asignado a
            </Typography>
          </Divider>
          <TextField select label="Usuario principal" value={primaryUserId} onChange={(e) => setPrimaryUserId(e.target.value)} fullWidth>
            <MenuItem value="">— Ninguno —</MenuItem>
            {users.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.fullName || u.email}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Usuarios asignados"
            value={assignedUserIds}
            onChange={multiSelectChange(setAssignedUserIds)}
            SelectProps={{ multiple: true }}
            fullWidth
          >
            {users.map((u) => (
              <MenuItem key={u.id} value={String(u.id)}>
                {u.fullName || u.email}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Equipos" value={teamIds} onChange={multiSelectChange(setTeamIds)} SelectProps={{ multiple: true }} fullWidth>
            {teams.map((t) => (
              <MenuItem key={t.id} value={String(t.id)}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>

          <Divider textAlign="left">
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Más información
            </Typography>
          </Divider>
          <TextField select label="Contratistas" value={vendorIds} onChange={multiSelectChange(setVendorIds)} SelectProps={{ multiple: true }} fullWidth>
            {vendors.map((v) => (
              <MenuItem key={v.id} value={String(v.id)}>
                {v.companyName}
              </MenuItem>
            ))}
          </TextField>
            <TextField
              label="Puesta en servicio"
              type="date"
              value={inServiceDate}
              onChange={(e) => setInServiceDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Vencimiento de garantía"
              type="date"
              value={warrantyExpirationDate}
              onChange={(e) => setWarrantyExpirationDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

          <TextField
            label="Información adicional"
            value={additionalInfos}
            onChange={(e) => setAdditionalInfos(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />

          <Divider textAlign="left">
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Estructura
            </Typography>
          </Divider>
          <TextField select label="Repuestos" value={partIds} onChange={multiSelectChange(setPartIds)} SelectProps={{ multiple: true }} fullWidth>
            {parts.map((p) => (
              <MenuItem key={p.id} value={String(p.id)}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
            <TextField select label="Activo padre" value={parentAssetId} onChange={(e) => setParentAssetId(e.target.value)} fullWidth>
              <MenuItem value="">— Ninguno —</MenuItem>
              {selectableParents.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? (isEditMode ? 'Guardando…' : 'Creando…') : isEditMode ? 'Guardar cambios' : 'Crear'}
          </Button>
        </DialogActions>
      </form>
      <ConfirmDialog
        open={discardOpen}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={handleDiscardConfirm}
        confirmText="Descartar cambios"
        question="¿Descartar cambios no guardados? Si sales ahora, perderás los cambios no guardados"
      />
    </Dialog>
  );
}
