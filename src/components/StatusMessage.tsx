import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

type Tone = 'info' | 'warning' | 'error' | 'success';

const ICONS = { info: Info, warning: AlertTriangle, error: XCircle, success: CheckCircle2 };

interface Props {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  actions?: ReactNode;
}

export function StatusMessage({ tone = 'info', title, children, actions }: Props) {
  const Icon = ICONS[tone];
  return (
    <div className={`status status--${tone} appear`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={18} className="status__icon" />
      <div>
        {title && <div className="status__title">{title}</div>}
        {children}
        {actions && <div className="status__actions">{actions}</div>}
      </div>
    </div>
  );
}
