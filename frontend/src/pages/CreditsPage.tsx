import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckIcon from '@mui/icons-material/Check';
import LockIcon from '@mui/icons-material/Lock';
import { addCredits } from '../api/client';
import { useAuthStore } from '../store/authStore';

// ============================================================
// Credit package data
// ============================================================
interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: string;
  description: string;
  popular?: boolean;
}

const PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 10,
    price: '$9.99',
    description: '~2 full analyses',
  },
  {
    id: 'professional',
    name: 'Professional',
    credits: 50,
    price: '$39.99',
    description: '~10 full analyses',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    credits: 200,
    price: '$129.99',
    description: '~40 full analyses',
  },
];

// ============================================================
// Package Card
// ============================================================
interface PackageCardProps {
  pkg: CreditPackage;
  onPurchaseClick: (credits: number, pkgId: string) => void;
  purchasing: string | null; // id of the package currently being purchased
}

function PackageCard({ pkg, onPurchaseClick, purchasing }: PackageCardProps) {
  const isLoading = purchasing === pkg.id;

  return (
    <Card
      sx={{
        flex: '1 1 220px',
        position: 'relative',
        overflow: 'visible',
        border: '2px solid',
        borderColor: pkg.popular ? 'primary.main' : 'divider',
        boxShadow: pkg.popular
          ? (t) => `0 0 0 1px ${alpha(t.palette.primary.main, 0.25)}, 0 8px 24px ${alpha('#000', 0.25)}`
          : undefined,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      {/* Popular badge */}
      {pkg.popular && (
        <Box
          sx={{
            position: 'absolute',
            top: -13,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1,
          }}
        >
          <Chip
            label="POPULAR"
            size="small"
            sx={{
              height: 24,
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              background: 'linear-gradient(135deg, #10B981 0%, #0E7C5A 100%)',
              color: '#fff',
              boxShadow: (t) => `0 2px 8px ${alpha(t.palette.primary.main, 0.4)}`,
            }}
          />
        </Box>
      )}

      <CardContent sx={{ p: 3, textAlign: 'center' }}>
        {/* Package name */}
        <Typography variant="h5" sx={{ mb: 0.5 }}>
          {pkg.name}
        </Typography>

        {/* Credit count */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
          <BoltIcon sx={{ color: 'primary.main', fontSize: '1.25rem' }} />
          <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1 }}>
            {pkg.credits}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', alignSelf: 'flex-end', mb: 0.25 }}>
            credits
          </Typography>
        </Box>

        {/* Price */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: pkg.popular ? 'primary.main' : 'text.primary',
            mb: 0.5,
          }}
        >
          {pkg.price}
        </Typography>

        {/* Description */}
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 2.5 }}>
          {pkg.description}
        </Typography>

        <Button
          variant={pkg.popular ? 'contained' : 'outlined'}
          fullWidth
          onClick={() => onPurchaseClick(pkg.credits, pkg.id)}
          disabled={!!purchasing}
          startIcon={
            isLoading ? (
              <CircularProgress size={16} sx={{ color: 'inherit' }} />
            ) : undefined
          }
          aria-label={`Purchase ${pkg.credits} credits for ${pkg.price}`}
        >
          {isLoading ? 'Processing...' : 'Purchase'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Usage guide
// ============================================================
const USAGE_ROWS = [
  { mode: 'Full Analysis (8 stages)', credits: 5, description: 'Complete IC-ready package' },
  { mode: 'Quick Screen (3 stages)', credits: 1, description: 'Research + market + memo' },
  { mode: 'Custom (varies)', credits: '1–4', description: 'Selected stages only' },
];

// ============================================================
// Page
// ============================================================
const ADMIN_GATE_PASSWORD = 'Password';

export default function CreditsPage() {
  const user = useAuthStore((s) => s.user);
  const updateCredits = useAuthStore((s) => s.updateCredits);

  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Admin gate dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingCredits, setPendingCredits] = useState<number | null>(null);
  const [pendingPkgId, setPendingPkgId] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState(false);

  // Opens the admin gate dialog instead of purchasing directly
  const handlePurchaseClick = (credits: number, pkgId: string) => {
    setPendingCredits(credits);
    setPendingPkgId(pkgId);
    setAdminPassword('');
    setAdminPasswordError(false);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setAdminPassword('');
    setAdminPasswordError(false);
  };

  const handleAdminConfirm = async () => {
    if (adminPassword !== ADMIN_GATE_PASSWORD) {
      setAdminPasswordError(true);
      return;
    }
    setDialogOpen(false);
    if (pendingCredits !== null && pendingPkgId !== null) {
      await handlePurchase(pendingCredits, pendingPkgId);
    }
  };

  const handlePurchase = async (credits: number, pkgId: string) => {
    setPurchasing(pkgId);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await addCredits(credits);
      updateCredits(res.new_balance);
      setSuccessMsg(
        `Successfully added ${credits} credits. New balance: ${res.new_balance} credits.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* Page header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h2" sx={{ mb: 0.5 }}>
            Buy Credits
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Credits are used to run AI analysis pipelines.
          </Typography>
        </Box>

        {/* Current balance chip */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: 2,
            border: '1px solid',
            borderColor: (t) => alpha(t.palette.primary.main, 0.25),
            backgroundColor: (t) => alpha(t.palette.primary.main, 0.06),
          }}
        >
          <BoltIcon sx={{ color: 'primary.main', fontSize: '1.125rem' }} />
          <Box>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', lineHeight: 1 }}>
              Current balance
            </Typography>
            <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 700 }}>
              {user?.credits ?? 0} credits
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Notifications */}
      {successMsg && (
        <Alert
          severity="success"
          icon={<CheckIcon fontSize="small" />}
          sx={{ mb: 3 }}
          onClose={() => setSuccessMsg(null)}
        >
          {successMsg}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Package cards ──────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 5, alignItems: 'stretch' }}>
        {PACKAGES.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            purchasing={purchasing}
            onPurchaseClick={handlePurchaseClick}
          />
        ))}
      </Box>

      {/* ── Admin gate dialog ─────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockIcon fontSize="small" sx={{ color: 'warning.main' }} />
          Admin Authorisation Required
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Enter the admin password to add{' '}
            <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {pendingCredits} credits
            </Box>{' '}
            to this account.
          </Typography>
          <TextField
            label="Admin password"
            type="password"
            value={adminPassword}
            onChange={(e) => { setAdminPassword(e.target.value); setAdminPasswordError(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdminConfirm(); }}
            error={adminPasswordError}
            helperText={adminPasswordError ? 'Incorrect password' : undefined}
            fullWidth
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            inputProps={{ 'aria-label': 'Admin password' }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={handleDialogClose} color="inherit" size="small">
            Cancel
          </Button>
          <Button onClick={handleAdminConfirm} variant="contained" size="small">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Usage guide ───────────────────────────────────────── */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ textTransform: 'none', letterSpacing: 0, mb: 2 }}>
            Credit Usage Guide
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }} aria-label="Credit usage guide">
            <Box component="thead">
              <Box component="tr">
                {['Analysis Mode', 'Credits', 'Description'].map((col) => (
                  <Box
                    key={col}
                    component="th"
                    sx={{
                      textAlign: 'left',
                      pb: 1,
                      color: 'text.disabled',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {col}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {USAGE_ROWS.map((row) => (
                <Box component="tr" key={row.mode}>
                  <Box component="td" sx={{ py: 1.25, pr: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                      {row.mode}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ py: 1.25, pr: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <BoltIcon sx={{ fontSize: '0.875rem', color: 'primary.main' }} />
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: 'primary.main', fontFamily: 'monospace' }}
                      >
                        {row.credits}
                      </Typography>
                    </Box>
                  </Box>
                  <Box component="td" sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {row.description}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          <Typography variant="caption" sx={{ color: 'text.disabled', mt: 2, display: 'block' }}>
            Note: Credits are consumed when an analysis job is started. Pausing or stopping a job
            does not refund credits.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
