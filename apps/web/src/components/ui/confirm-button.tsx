import { useState } from 'react';
import { Button, type ButtonProps } from './button';

interface ConfirmButtonProps extends Omit<ButtonProps, 'onClick'> {
  confirmMessage?: string;
  onConfirm: () => void | Promise<void>;
}

export const ConfirmButton = ({ confirmMessage = 'Are you sure?', onConfirm, children, ...props }: ConfirmButtonProps) => {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      {...props}
      disabled={busy || props.disabled}
      onClick={async () => {
        if (!window.confirm(confirmMessage)) return;
        setBusy(true);
        try {
          await onConfirm();
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
    </Button>
  );
};
