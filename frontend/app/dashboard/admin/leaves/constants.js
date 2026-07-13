export const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/30',  dot: 'bg-amber-400' },
  APPROVED:  { label: 'Approved',  bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  REJECTED:  { label: 'Rejected',  bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30',    dot: 'bg-red-400' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-muted/30',      text: 'text-muted-foreground', border: 'border-border', dot: 'bg-muted-foreground' },
};

export const TYPE_COLORS = {
  ANNUAL:       'bg-blue-500/15 text-blue-400',
  SICK:         'bg-red-500/15 text-red-400',
  CASUAL:       'bg-purple-500/15 text-purple-400',
  MATERNITY:    'bg-pink-500/15 text-pink-400',
  PATERNITY:    'bg-cyan-500/15 text-cyan-400',
  UNPAID:       'bg-orange-500/15 text-orange-400',
  BEREAVEMENT:  'bg-slate-500/15 text-slate-400',
  MARRIAGE:     'bg-rose-500/15 text-rose-400',
  STUDY:        'bg-indigo-500/15 text-indigo-400',
  HAJJ:         'bg-emerald-500/15 text-emerald-400',
  COMPENSATORY: 'bg-teal-500/15 text-teal-400',
  OTHER:        'bg-muted/30 text-muted-foreground',
};

export const LEAVE_TYPES = Object.keys(TYPE_COLORS);

export const ACCEPTED_POLICY_EXTENSIONS = ['txt', 'pdf', 'docx'];
export const MAX_POLICY_FILE_SIZE = 10 * 1024 * 1024;
