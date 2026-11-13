import { forwardRef } from 'react';
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from 'react';
import { Link } from 'react-router';
import './Button.css';

export type ButtonVariant = 'primary' | 'quiet';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export interface ButtonLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  variant?: ButtonVariant;
  children: ReactNode;
}

function buttonClasses(variant: ButtonVariant, className?: string) {
  return ['btn', variant, className].filter(Boolean).join(' ');
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { type = 'button', variant = 'primary', className, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses(variant, className)}
        {...props}
      />
    );
  },
);

export function ButtonLink({
  to,
  variant = 'primary',
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    // TODO(task 7): render the play icon from task 2 next to the label.
    <Link to={to} className={buttonClasses(variant, className)} {...rest}>
      {children}
    </Link>
  );
}
