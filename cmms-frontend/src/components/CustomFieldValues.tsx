import { useEffect, useState } from 'react';
import { Box, TextField, MenuItem, Checkbox, FormControlLabel, Typography } from '@mui/material';
import { customFieldsApi, type CustomField, type CustomFieldEntityType } from '../api/customFields';

interface Props {
  entityType: CustomFieldEntityType;
  targetType: 'work-order' | 'pm';
  entityId: number;
}

export default function CustomFieldValues({ entityType, targetType, entityId }: Props) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [values, setValues] = useState<Record<number, string>>({});

  useEffect(() => {
    async function load() {
      const definitions = await customFieldsApi.list(entityType);
      setFields(definitions);
      const currentValues =
        targetType === 'work-order'
          ? await customFieldsApi.getValuesForWorkOrder(entityId)
          : await customFieldsApi.getValuesForPM(entityId);
      const map: Record<number, string> = {};
      currentValues.forEach((v) => {
        map[v.customFieldId] = v.value ?? '';
      });
      setValues(map);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, targetType, entityId]);

  async function handleChange(fieldId: number, value: string) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    const payload = { [fieldId]: value };
    if (targetType === 'work-order') {
      await customFieldsApi.setValuesForWorkOrder(entityId, payload);
    } else {
      await customFieldsApi.setValuesForPM(entityId, payload);
    }
  }

  if (fields.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Campos personalizados
      </Typography>
      {fields.map((field) => {
        const value = values[field.id] ?? '';
        if (field.type === 'CHECKBOX') {
          return (
            <FormControlLabel
              key={field.id}
              control={<Checkbox checked={value === 'true'} onChange={(e) => handleChange(field.id, String(e.target.checked))} />}
              label={field.name}
            />
          );
        }
        if (field.type === 'SELECT') {
          return (
            <TextField
              key={field.id}
              select
              label={field.name}
              value={value}
              onChange={(e) => handleChange(field.id, e.target.value)}
              required={field.required}
              fullWidth
            >
              {field.options.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>
          );
        }
        return (
          <TextField
            key={field.id}
            label={field.name}
            type={field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : 'text'}
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            required={field.required}
            InputLabelProps={field.type === 'DATE' ? { shrink: true } : undefined}
            fullWidth
          />
        );
      })}
    </Box>
  );
}
