import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import OutlinedInput from '@mui/material/OutlinedInput';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import FormHelperText from '@mui/material/FormHelperText';
import { tokens } from '../theme';
import type { FieldConfig } from '../types';

interface Props {
  field: FieldConfig;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

/**
 * Renders a single config-driven field as the appropriate Material UI control.
 * Supports the three field types (text, select, radio), required markers,
 * multi-select (chips), multiline text, and inline validation errors.
 */
export function DynamicField({ field, value, error, onChange }: Props) {
  const label = field.label + (field.required ? ' *' : '');
  const helper = error || field.helperText || ' ';

  // --- TEXT ---
  if (field.type === 'text') {
    const numeric = field.validation?.numeric || field.validation?.integer;
    return (
      <TextField
        label={label}
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        error={Boolean(error)}
        helperText={helper}
        fullWidth
        multiline={field.multiline}
        minRows={field.multiline ? 3 : undefined}
        inputProps={numeric ? { inputMode: 'numeric' } : undefined}
      />
    );
  }

  // --- SELECT (multiple => chips) ---
  if (field.type === 'select' && field.multiple) {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <FormControl fullWidth error={Boolean(error)}>
        <InputLabel>{label}</InputLabel>
        <Select
          multiple
          value={selected}
          onChange={(e) =>
            onChange(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)
          }
          input={<OutlinedInput label={label} />}
          renderValue={(vals) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(vals as string[]).map((v) => {
                const opt = field.options?.find((o) => o.value === v);
                return <Chip key={v} label={opt?.label ?? v} size="small" />;
              })}
            </Box>
          )}
        >
          {(field.options ?? []).map((opt) => (
            <MenuItem
              key={opt.value}
              value={opt.value}
              sx={{ gap: 1, '&.Mui-selected, &.Mui-selected:hover': { bgcolor: tokens.teal050 } }}
            >
              <Checkbox
                checked={selected.includes(opt.value)}
                size="small"
                sx={{ p: 0.5, color: tokens.gray400, '&.Mui-checked': { color: tokens.teal600 } }}
              />
              <ListItemText primary={opt.label} />
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>{helper}</FormHelperText>
      </FormControl>
    );
  }

  // --- SELECT (single) ---
  if (field.type === 'select') {
    return (
      <TextField
        select
        label={label}
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        error={Boolean(error)}
        helperText={helper}
        fullWidth
      >
        {(field.options ?? []).map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  // --- RADIO ---
  return (
    <FormControl error={Boolean(error)} component="fieldset" variant="standard">
      <FormLabel
        component="legend"
        sx={{
          font: "400 12px/16px 'Roboto', sans-serif",
          color: error ? tokens.danger600 : tokens.gray600,
          mb: 1.5,
          '&.Mui-focused': { color: error ? tokens.danger600 : tokens.gray600 },
        }}
      >
        {label}
      </FormLabel>
      <RadioGroup
        row
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        sx={{ gap: 3 }}
      >
        {(field.options ?? []).map((opt) => (
          <FormControlLabel
            key={opt.value}
            value={opt.value}
            control={<Radio />}
            label={opt.label}
            sx={{ '& .MuiFormControlLabel-label': { font: "500 15px/22px 'Roboto', sans-serif" } }}
          />
        ))}
      </RadioGroup>
      <FormHelperText>{helper}</FormHelperText>
    </FormControl>
  );
}
