import { useState } from 'react';
import { Box, Typography, Popover, IconButton, alpha } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface DataSourceTooltipProps {
  stageName: string;
  stageNumber: number;
  description: string;
}

export default function DataSourceTooltip({ stageName, stageNumber, description }: DataSourceTooltipProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => setAnchorEl(open ? null : e.currentTarget)}
        aria-label={`Data source info: ${stageName}`}
        sx={{
          p: 0.25,
          color: 'text.disabled',
          opacity: 0.6,
          transition: 'opacity 0.15s, color 0.15s',
          '&:hover': { opacity: 1, color: 'primary.main', backgroundColor: 'transparent' },
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 15 }} />
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              p: 1.5,
              maxWidth: 260,
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              boxShadow: (t) => `0 4px 20px ${alpha(t.palette.common.black, 0.25)}`,
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
          <Box
            sx={{
              width: 18,
              height: 18,
              borderRadius: 0.5,
              backgroundColor: (t) => alpha(t.palette.primary.main, 0.12),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'primary.main', fontFamily: 'monospace' }}>
              {stageNumber}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.primary' }}>
            {stageName}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', lineHeight: 1.5 }}>
          {description}
        </Typography>
      </Popover>
    </>
  );
}
