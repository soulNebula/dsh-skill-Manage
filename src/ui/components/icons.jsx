// Small inline icons; no icon package, no external assets.
const BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

function Icon({ size = 16, children, ...rest }) {
  return <svg width={size} height={size} {...BASE} {...rest}>{children}</svg>
}

export function PlusIcon(props) {
  return <Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>
}

export function SearchIcon(props) {
  return <Icon {...props}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></Icon>
}

export function FolderIcon({ open = false, ...props }) {
  return (
    <Icon {...props}>
      {open
        ? <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h7.5A1.5 1.5 0 0 1 20 9.5v8A1.5 1.5 0 0 1 18.5 19h-14A1.5 1.5 0 0 1 3 17.5z" />
        : <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.5l2 2H19a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5z" />}
    </Icon>
  )
}

export function FileIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h4" />
    </Icon>
  )
}

export function ChevronIcon({ open = false, ...props }) {
  return (
    <Icon {...props}>
      <path d={open ? 'm8 10 4 4 4-4' : 'm10 8 4 4-4 4'} />
    </Icon>
  )
}

export function TrashIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13" />
      <path d="M10 11v5M14 11v5" />
    </Icon>
  )
}

export function RefreshIcon(props) {
  return (
    <Icon {...props}>
      <path d="M20 11a8 8 0 1 0-2.3 5.6" />
      <path d="M20 4v7h-7" />
    </Icon>
  )
}

export function SaveIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5 3h11l3 3v15H5z" />
      <path d="M8 3v6h7V3M8 14h8v7H8z" />
    </Icon>
  )
}

export function ShieldIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  )
}

export function XIcon(props) {
  return <Icon {...props}><path d="m6 6 12 12M18 6 6 18" /></Icon>
}

export function CopyIcon(props) {
  return (
    <Icon {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 5H6a1 1 0 0 0-1 1v9" />
    </Icon>
  )
}

export function BookIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h12.5v18H7a2.5 2.5 0 0 1-2.5-2.5z" />
      <path d="M4.5 18.5A2.5 2.5 0 0 1 7 16h12.5" />
      <path d="M9 7.5h6M9 11h5" />
    </Icon>
  )
}

export function AlertIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 3 2.8 20h18.4z" />
      <path d="M12 9v4M12 17h.01" />
    </Icon>
  )
}

export function GearIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.2 14.6a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.16.35.45.64.8.8H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
    </Icon>
  )
}
