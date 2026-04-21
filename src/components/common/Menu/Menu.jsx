import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  cloneElement,
  isValidElement,
  createContext,
  useContext,
} from 'react';
import './Menu.css';

const MenuCtx = createContext(null);

/**
 * Lightweight dropdown menu.
 *
 *   <Menu>
 *     <Menu.Trigger>
 *       <Button>Actions</Button>
 *     </Menu.Trigger>
 *     <Menu.List align="right">
 *       <Menu.Item onSelect={...}>Rename</Menu.Item>
 *       <Menu.Item danger onSelect={...}>Delete</Menu.Item>
 *     </Menu.List>
 *   </Menu>
 *
 * Closes on: outside click, Escape, or after an item fires onSelect.
 *
 * @param {{ className?: string, children?: React.ReactNode }} props
 */
export function Menu({ className = '', children }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <MenuCtx.Provider value={{ open, setOpen, toggle, close }}>
      <span
        ref={rootRef}
        className={['menu', className].filter(Boolean).join(' ')}
      >
        {children}
      </span>
    </MenuCtx.Provider>
  );
}

/**
 * Wraps the menu's trigger element (typically a <Button>). Injects the
 * click handler and aria-haspopup/expanded attributes.
 *
 * @param {{ children: React.ReactElement }} props
 */
function MenuTrigger({ children }) {
  const ctx = useContext(MenuCtx);
  if (!ctx || !isValidElement(children)) return children;
  return cloneElement(children, {
    onClick: (e) => {
      children.props.onClick?.(e);
      ctx.toggle();
    },
    'aria-haspopup': 'menu',
    'aria-expanded': ctx.open,
  });
}

/**
 * @param {{
 *   align?: 'left'|'right',
 *   className?: string,
 *   children?: React.ReactNode,
 * }} props
 */
function MenuList({ align = 'right', className = '', children }) {
  const ctx = useContext(MenuCtx);
  if (!ctx || !ctx.open) return null;
  return (
    <div
      role="menu"
      className={[
        'menu__list',
        `menu__list--${align}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

/**
 * Menu entry. Default renders a <button>. Pass `as={Link}` (or any component
 * accepting `onClick` + `className`) to render a routing link that still
 * closes the menu on activation.
 *
 * @param {{
 *   as?: React.ElementType,
 *   onSelect?: (e: React.MouseEvent) => void,
 *   danger?: boolean,
 *   disabled?: boolean,
 *   iconLeft?: React.ReactNode,
 *   className?: string,
 *   children?: React.ReactNode,
 * } & Omit<React.HTMLAttributes<HTMLElement>, 'onSelect'>} props
 */
function MenuItem({
  as: Tag = 'button',
  onSelect,
  danger,
  disabled,
  iconLeft,
  className = '',
  children,
  onClick,
  ...rest
}) {
  const ctx = useContext(MenuCtx);
  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
    onSelect?.(e);
    ctx?.close();
  };
  const isButton = Tag === 'button';
  return (
    <Tag
      {...(isButton ? { type: 'button', disabled } : {})}
      role="menuitem"
      aria-disabled={disabled || undefined}
      className={[
        'menu__item',
        danger ? 'menu__item--danger' : '',
        disabled ? 'menu__item--disabled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
      {...rest}
    >
      {iconLeft && <span className="menu__item-icon" aria-hidden>{iconLeft}</span>}
      <span className="menu__item-label">{children}</span>
    </Tag>
  );
}

function MenuHeader({ children, className = '' }) {
  return (
    <div className={['menu__header', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

function MenuSeparator({ className = '' }) {
  return <div role="separator" className={['menu__separator', className].filter(Boolean).join(' ')} />;
}

Menu.Trigger = MenuTrigger;
Menu.List = MenuList;
Menu.Item = MenuItem;
Menu.Header = MenuHeader;
Menu.Separator = MenuSeparator;
