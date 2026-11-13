import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import './AvatarMenu.css';

export function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLAnchorElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (open) {
      itemRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }

  function onTriggerKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onMenuKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      event.preventDefault();
      itemRef.current?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <div className="avatar-menu" ref={rootRef}>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menu da conta"
        className="avatar-menu__trigger"
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={onTriggerKeyDown}
        ref={triggerRef}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="avatar-menu__icon"
          focusable="false"
          shapeRendering="crispEdges"
          viewBox="0 0 8 8"
        >
          <g fill="currentColor">
            <rect x="2" y="0" width="4" height="1" />
            <rect x="1" y="1" width="6" height="3" />
            <rect x="2" y="4" width="4" height="1" />
            <rect x="0" y="5" width="8" height="3" />
          </g>
        </svg>
      </button>

      {open ? (
        <div
          className="avatar-menu__list"
          id={menuId}
          onKeyDown={onMenuKeyDown}
          role="menu"
          tabIndex={-1}
        >
          <Link
            className="avatar-menu__item"
            onClick={() => setOpen(false)}
            ref={itemRef}
            role="menuitem"
            to="/ajustes"
          >
            Ajustes
          </Link>
        </div>
      ) : null}
    </div>
  );
}
