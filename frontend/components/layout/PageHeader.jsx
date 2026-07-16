import { Fragment } from 'react';
import { ChevronRight } from 'lucide-react';

export default function PageHeader({ title, description, actions, breadcrumbs }) {
  return (
    <div className="sticky top-0 z-20 border-b border-border bg-card/80 px-6 py-5 backdrop-blur-xl md:px-8">
      {breadcrumbs?.length > 0 && (
        <nav className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          {breadcrumbs.map((crumb, i) => (
            <Fragment key={crumb.label}>
              {i > 0 && <ChevronRight size={12} className="shrink-0" />}
              <span className={i === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''}>{crumb.label}</span>
            </Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
      </div>
    </div>
  );
}
