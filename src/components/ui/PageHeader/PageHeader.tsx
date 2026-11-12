import type { ReactNode } from 'react';
import './PageHeader.css';

export interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  const classes = ['ui-page-header', className].filter(Boolean).join(' ');

  return (
    <header className={classes}>
      <div className="ui-page-header__main">
        {eyebrow ? (
          <p className="ui-page-header__eyebrow">{eyebrow}</p>
        ) : null}
        <h1 className="ui-page-header__title">{title}</h1>
        {description ? (
          <p className="ui-page-header__description">{description}</p>
        ) : null}
        {meta ? <div className="ui-page-header__meta">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="ui-page-header__actions">{actions}</div>
      ) : null}
    </header>
  );
}
