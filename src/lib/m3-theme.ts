'use client';

import { createTheme } from '@mui/material/styles';

const s = (v: number) => `${v}px`;

export const m3Theme = createTheme({
  typography: {
    fontFamily: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    h1: { fontWeight: 400, fontSize: '2.25rem', lineHeight: '2.75rem' },
    h2: { fontWeight: 400, fontSize: '2rem', lineHeight: '2.5rem' },
    h3: { fontWeight: 400, fontSize: '1.75rem', lineHeight: '2.25rem' },
    h4: { fontWeight: 400, fontSize: '1.5rem', lineHeight: '2rem' },
    h5: { fontWeight: 500, fontSize: '1rem', lineHeight: '1.5rem', letterSpacing: '0.009375em' },
    h6: { fontWeight: 500, fontSize: '0.875rem', lineHeight: '1.25rem', letterSpacing: '0.00625em' },
    subtitle1: { fontWeight: 400, fontSize: '1.375rem', lineHeight: '1.75rem' },
    subtitle2: { fontWeight: 500, fontSize: '1rem', lineHeight: '1.5rem', letterSpacing: '0.009375em' },
    body1: { fontWeight: 400, fontSize: '1rem', lineHeight: '1.5rem', letterSpacing: '0.03125em' },
    body2: { fontWeight: 400, fontSize: '0.875rem', lineHeight: '1.25rem', letterSpacing: '0.015625em' },
    button: { fontWeight: 500, fontSize: '0.875rem', lineHeight: '1.25rem', letterSpacing: '0.00625em', textTransform: 'none' },
    caption: { fontWeight: 400, fontSize: '0.75rem', lineHeight: '1rem', letterSpacing: '0.025em' },
  },
  shape: { borderRadius: 28 },
  components: {
    MuiButtonBase: {
      defaultProps: { disableRipple: true },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: '9999px',
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          letterSpacing: '0.00625em',
          padding: '10px 24px',
          minHeight: 40,
        },
        sizeSmall: { padding: '6px 16px', minHeight: 32, fontSize: '0.8125rem' },
        sizeLarge: { padding: '14px 32px', minHeight: 48 },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 1px 3px 1px rgba(0,0,0,0.15), 0 1px 2px 0 rgba(0,0,0,0.30)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: s(28),
          overflow: 'hidden',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: s(28),
          padding: '24px',
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: { height: 64 },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          borderRadius: s(16),
          margin: '4px 0',
          padding: '0 12px',
          minWidth: 64,
        },
        label: {
          fontSize: '0.75rem',
          fontWeight: 500,
          letterSpacing: '0.03125em',
          '&.Mui-selected': { fontSize: '0.75rem' },
        },
      },
    },
  },
});
