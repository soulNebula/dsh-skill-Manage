import { useMemo, useState } from 'react'

import { buildTree } from '../lib/tree.js'
import { ChevronIcon, FileIcon, FolderIcon } from './icons.jsx'

function TreeLevel({ nodes, depth, collapsed, toggle, selectedPath, onOpen }) {
  return (
    <ul className="skm-tree" role="group">
      {nodes.map(node => {
        const pad = { paddingLeft: `${8 + depth * 14}px` }
        if (node.type === 'dir') {
          const open = !collapsed.has(node.path)
          return (
            <li key={node.path} role="treeitem" aria-expanded={open}>
              <button className="skm-treeRow is-dir" type="button" style={pad} onClick={() => toggle(node.path)}>
                <ChevronIcon size={14} open={open} />
                <FolderIcon size={15} open={open} />
                <span className="skm-treeName">{node.name}</span>
              </button>
              {open && node.children?.length > 0 && (
                <TreeLevel
                  nodes={node.children}
                  depth={depth + 1}
                  collapsed={collapsed}
                  toggle={toggle}
                  selectedPath={selectedPath}
                  onOpen={onOpen}
                />
              )}
            </li>
          )
        }
        const active = selectedPath === node.path
        return (
          <li key={node.path} role="treeitem">
            <button
              className={`skm-treeRow is-file${active ? ' is-active' : ''}${node.text === false ? ' is-binary' : ''}`}
              type="button"
              style={pad}
              title={node.path}
              onClick={() => onOpen(node)}
            >
              <FileIcon size={15} />
              <span className="skm-treeName">{node.name}</span>
              {node.symlink && <span className="skm-treeFlag">link</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function FileTree({ flat, selectedPath, onOpen, t }) {
  const [collapsed, setCollapsed] = useState(() => new Set())
  const nodes = useMemo(() => buildTree(flat), [flat])

  function toggle(path) {
    setCollapsed(previous => {
      const next = new Set(previous)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  if (!nodes.length) return <p className="skm-treeEmpty">{t('noFile')}</p>
  return (
    <TreeLevel
      nodes={nodes}
      depth={0}
      collapsed={collapsed}
      toggle={toggle}
      selectedPath={selectedPath}
      onOpen={onOpen}
    />
  )
}
