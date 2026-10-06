import { forwardRef } from 'react';
import { clsx } from 'clsx';
export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'ghost' | 'outline';
    size?: 'normal' | 'icon';
  }
>(function Button({ className, variant = 'outline', size = 'normal', ...props }, ref) {
  return (
    <button
      ref={ref}
      className={clsx('button', `button-${variant}`, size === 'icon' && 'icon-button', className)}
      {...props}
    />
  );
});
