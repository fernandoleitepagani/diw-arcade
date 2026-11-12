import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      type = 'button',
      variant = 'primary',
      size = 'md',
      className,
      ...props
    },
    ref,
  ) {
    const classes = [
      'ui-button',
      `ui-button--${variant}`,
      `ui-button--${size}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return <button ref={ref} type={type} className={classes} {...props} />;
  },
);
