export const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   bg: 'bg-warning/15',  text: 'text-warning',  border: 'border-warning/30',  dot: 'bg-warning' },
  PENDING_MANAGER: { label: 'Awaiting Manager', bg: 'bg-warning/15', text: 'text-warning', border: 'border-warning/30', dot: 'bg-warning' },
  PENDING_ADMIN: { label: 'Awaiting Admin', bg: 'bg-info/15', text: 'text-info', border: 'border-info/30', dot: 'bg-info' },
  APPROVED:  { label: 'Approved',  bg: 'bg-success/15', text: 'text-success', border: 'border-success/30', dot: 'bg-success' },
  REJECTED:  { label: 'Rejected',  bg: 'bg-destructive/15',    text: 'text-destructive',    border: 'border-destructive/30',    dot: 'bg-destructive' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-muted/30',      text: 'text-muted-foreground', border: 'border-border', dot: 'bg-muted-foreground' },
};

export const TYPE_COLORS = {
  EMERGENCY:    'bg-orange-500/15 text-orange-400',
  ANNUAL:       'bg-info/15 text-info',
  SICK:         'bg-destructive/15 text-destructive',
  CASUAL:       'bg-chart-4/15 text-chart-4',
  MATERNITY:    'bg-pink-500/15 text-pink-400',
  PATERNITY:    'bg-info/15 text-info',
  UNPAID:       'bg-warning/15 text-warning',
  BEREAVEMENT:  'bg-muted/60 text-muted-foreground',
  MARRIAGE:     'bg-rose-500/15 text-rose-400',
  STUDY:        'bg-indigo-500/15 text-indigo-400',
  HAJJ:         'bg-success/15 text-success',
  COMPENSATORY: 'bg-teal-500/15 text-teal-400',
  OTHER:        'bg-muted/30 text-muted-foreground',
};

// Emergency is funded from Casual leave, not configured as its own policy.
export const LEAVE_TYPES = Object.keys(TYPE_COLORS).filter((type) => type !== 'EMERGENCY');
export const REQUEST_LEAVE_TYPES = ['EMERGENCY', ...LEAVE_TYPES];

export const ACCEPTED_POLICY_EXTENSIONS = ['txt', 'pdf', 'docx'];
export const MAX_POLICY_FILE_SIZE = 10 * 1024 * 1024;
