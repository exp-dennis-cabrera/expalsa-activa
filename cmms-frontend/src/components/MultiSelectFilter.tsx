import { useState } from 'react';
import { Button, Menu, MenuItem, Checkbox, ListItemText } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';

interface Option {
  value: string;
  label: string;
}

interface Props {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
}

export default function MultiSelectFilter({ label, options, selected, onChange }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const buttonLabel = selected.length === 0
    ? label
    : options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(', ');

  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        endIcon={<ExpandMoreIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          // Misma altura que el buscador (TextField size="small" = 40px),
          // para que la barra de filtros quede alineada.
          height: 40,
          bgcolor: 'background.paper',
          borderColor: 'divider',
          color: selected.length > 0 ? 'primary.main' : 'text.primary',
          fontWeight: selected.length > 0 ? 700 : 500,
          maxWidth: 260,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {buttonLabel}
      </Button>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        {options.map((option) => (
          <MenuItem key={option.value} onClick={() => toggle(option.value)} dense>
            <Checkbox checked={selected.includes(option.value)} size="small" />
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
