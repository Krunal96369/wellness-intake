import { useState, type ReactNode } from 'react';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import CheckIcon from '@mui/icons-material/Check';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { tokens } from '../theme';
import type { FilterOption } from '../lib/filters';

interface FilterMenuProps<T extends string> {
  /** Leading icon describing the filter dimension. */
  icon: ReactNode;
  /** Accessible name for the button and menu, e.g. "Sort order". */
  ariaLabel: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
}

/**
 * Compact single-select filter, styled as a pill button that turns teal when
 * set to anything other than its first ("default") option. Built on MUI Menu so
 * keyboard navigation, focus return and click-away are handled for us.
 */
export function FilterMenu<T extends string>({
  icon,
  ariaLabel,
  value,
  options,
  onChange,
}: FilterMenuProps<T>) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const selected = options.find((o) => o.value === value) ?? options[0];
  const active = value !== options[0].value;

  const handleSelect = (next: T) => {
    onChange(next);
    setAnchorEl(null);
  };

  const accent = active ? tokens.teal600 : tokens.gray500;

  return (
    <>
      <Button
        color="inherit"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        startIcon={icon}
        endIcon={<ArrowDropDownIcon />}
        sx={{
          height: 38,
          px: 1.25,
          borderRadius: `${tokens.radiusInput}px`,
          border: `1px solid ${active ? tokens.teal600 : tokens.gray300}`,
          bgcolor: active ? tokens.teal050 : tokens.white,
          color: active ? tokens.teal600 : tokens.gray700,
          font: "500 13px/18px 'Roboto', sans-serif",
          whiteSpace: 'nowrap',
          '& .MuiButton-startIcon': { color: accent, mr: 0.75 },
          '& .MuiButton-endIcon': { color: accent, ml: 0.25 },
          '&:hover': {
            bgcolor: active ? tokens.teal050 : tokens.gray050,
            borderColor: active ? tokens.teal600 : tokens.gray400,
          },
        }}
      >
        {selected.label}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        MenuListProps={{ 'aria-label': ariaLabel, dense: true }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 184,
              borderRadius: `${tokens.radiusInput}px`,
              border: `1px solid ${tokens.gray200}`,
              boxShadow: tokens.shadowPop,
            },
          },
        }}
      >
        {options.map((opt) => {
          const on = opt.value === value;
          return (
            <MenuItem
              key={opt.value}
              selected={on}
              onClick={() => handleSelect(opt.value)}
              sx={{
                mx: 0.5,
                borderRadius: `${tokens.radiusInput - 2}px`,
                font: "400 14px/19px 'Roboto', sans-serif",
                '&.Mui-selected, &.Mui-selected:hover': { bgcolor: tokens.teal050 },
              }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                <CheckIcon sx={{ fontSize: 16, color: on ? tokens.teal600 : 'transparent' }} />
              </ListItemIcon>
              {opt.label}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
