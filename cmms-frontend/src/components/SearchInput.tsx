import { InputAdornment, TextField } from '@mui/material';
import SearchTwoToneIcon from '@mui/icons-material/SearchTwoTone';

/**
 * Copia fiel de content/own/components/SearchInput.tsx de Atlas CMMS
 * (commit 44069b69).
 *
 * Detalles que importan: NO lleva size="small" -- por eso el campo tiene
 * altura completa y la lupa queda centrada -- y el icono es azul
 * (color="primary").
 */
interface OwnProps {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  value?: string;
}

export default function SearchInput({ onChange, value }: OwnProps) {
  return (
    <TextField
      sx={{ m: 0 }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchTwoToneIcon color="primary" />
          </InputAdornment>
        ),
      }}
      placeholder="Buscar"
      variant="outlined"
      value={value}
      onChange={onChange}
    />
  );
}
