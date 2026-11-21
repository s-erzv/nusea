import { useEffect, useId, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`admin-modal admin-modal-${size}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
    >
      {open ? (
        <div className="admin-modal-card">
          <header className="admin-modal-head">
            <h2 id={titleId}>{title}</h2>
            <button
              type="button"
              className="admin-modal-close"
              onClick={onClose}
              aria-label="Tutup"
            >
              ×
            </button>
          </header>
          <div className="admin-modal-body">{children}</div>
          {footer ? <footer className="admin-modal-foot">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}
