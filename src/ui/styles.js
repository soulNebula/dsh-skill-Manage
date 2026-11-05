// All colors/sizes fall back to DSH aliases; dark mode follows the host.
export const STYLE = `
.skm-app, .skm-overlay {
  --skm-radius: 12px;
  --skm-brand: var(--dsw-alias-brand-primary, #2f6fde);
  --skm-border: var(--dsw-alias-border-l1, #d8dbe2);
  --skm-surface: var(--dsw-alias-bg-layer-1, #ffffff);
  --skm-bg: var(--dsw-alias-bg-base, #ffffff);
  --skm-text: var(--dsw-alias-label-primary, #1f2328);
  --skm-muted: var(--dsw-alias-label-secondary, #5b6270);
  --skm-danger: var(--dsw-alias-state-error-primary, #c0392b);
  --skm-warn: var(--dsw-alias-state-warn-primary, #a86700);
  --skm-ok: var(--dsw-alias-state-success-primary, #2e7d32);
  --skm-on-brand: var(--dsw-alias-label-primary-inverted, #fff);
  font-family: var(--dsw-alias-font-sans, system-ui, -apple-system, "Segoe UI", sans-serif);
  font-size: 14px;
  line-height: 1.5;
}
.skm-app {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--skm-bg);
  color: var(--skm-text);
  font-family: var(--dsw-alias-font-sans, system-ui, -apple-system, "Segoe UI", sans-serif);
  font-size: 14px;
  line-height: 1.5;
}
.skm-app, .skm-app *, .skm-overlay, .skm-overlay * { box-sizing: border-box; }
.skm-scale {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  flex: 0 0 auto;
  transform-origin: top left;
}

.skm-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px 14px;
  border-bottom: 1px solid var(--skm-border);
  flex: 0 0 auto;
}
.skm-headerMain { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
.skm-logo {
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border-radius: 11px;
  display: grid;
  place-items: center;
  color: var(--skm-brand);
  background: color-mix(in srgb, var(--skm-brand) 14%, transparent);
}
.skm-headerText { min-width: 0; }
.skm-title { margin: 0; font-size: 20px; line-height: 1.25; font-weight: 650; }
.skm-subtitle { margin: 4px 0 0; color: var(--skm-muted); font-size: 12.5px; max-width: 720px; }
.skm-headerActions { display: flex; align-items: center; gap: 10px; flex: 0 0 auto; }
.skm-count { color: var(--skm-muted); font-size: 12.5px; white-space: nowrap; }

.skm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid var(--skm-border);
  background: var(--skm-surface);
  color: inherit;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color .12s, color .12s, background .12s;
}
.skm-btn:hover:not(:disabled) { border-color: var(--skm-brand); color: var(--skm-brand); }
.skm-btn:disabled { opacity: .45; cursor: default; }
.skm-btn.is-primary { background: var(--skm-brand); border-color: transparent; color: var(--skm-on-brand); }
.skm-btn.is-primary:hover:not(:disabled) { color: var(--skm-on-brand); filter: brightness(1.06); }
.skm-btn.is-danger { color: var(--skm-danger); border-color: color-mix(in srgb, var(--skm-danger) 38%, transparent); }
.skm-btn.is-danger:hover:not(:disabled) { color: var(--skm-on-brand); background: var(--skm-danger); border-color: var(--skm-danger); }
.skm-btn.is-ghostDanger { color: var(--skm-danger); background: transparent; }
.skm-btn.is-small { padding: 4px 9px; font-size: 12px; }

.skm-iconBtn {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--skm-muted);
  cursor: pointer;
  flex: 0 0 auto;
}
.skm-iconBtn:hover { background: color-mix(in srgb, var(--skm-brand) 10%, transparent); color: var(--skm-brand); }
.skm-iconBtn.is-tiny { width: 22px; height: 22px; font-size: 16px; }

.skm-body {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  min-height: 0;
}
.skm-sidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding: 12px;
  border-right: 1px solid var(--skm-border);
  background: color-mix(in srgb, var(--skm-surface) 55%, transparent);
}
.skm-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 9px;
  border: 1px solid var(--skm-border);
  border-radius: 9px;
  background: var(--skm-bg);
  color: var(--skm-muted);
  flex: 0 0 auto;
}
.skm-searchInput {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--skm-text);
  font: inherit;
  font-size: 13px;
}
.skm-search:focus-within { border-color: var(--skm-brand); }

.skm-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; overflow: auto; min-height: 0; flex: 1 1 auto; }
.skm-listEmpty { color: var(--skm-muted); font-size: 12.5px; margin: 6px 4px; }
.skm-listItem {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 9px 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.skm-listItem:hover { background: var(--skm-bg); border-color: var(--skm-border); }
.skm-listItem.is-active { background: var(--skm-bg); border-color: var(--skm-brand); }
.skm-listTop { display: flex; align-items: center; gap: 8px; min-width: 0; }
.skm-listName { flex: 1 1 auto; min-width: 0; font-size: 13.5px; font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.skm-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--skm-muted); flex: 0 0 auto; }
.skm-dot.is-ok { background: var(--dsw-alias-state-success-primary, #2e9e5b); }
.skm-dot.is-bad { background: var(--skm-danger); }
.skm-listDesc {
  color: var(--skm-muted);
  font-size: 12px;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.skm-listMeta { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px; }
.skm-pill {
  font-size: 11px;
  line-height: 1.7;
  padding: 0 7px;
  border-radius: 999px;
  border: 1px solid var(--skm-border);
  color: var(--skm-muted);
  background: var(--skm-bg);
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.skm-pill.is-on { color: var(--skm-ok); border-color: color-mix(in srgb, var(--skm-ok) 38%, transparent); }
.skm-pill.is-warn { color: var(--skm-warn); border-color: color-mix(in srgb, var(--skm-warn) 38%, transparent); }
.skm-pill.is-bad { color: var(--skm-danger); border-color: color-mix(in srgb, var(--skm-danger) 38%, transparent); }

.skm-main { min-width: 0; min-height: 0; overflow: auto; padding: 18px 22px 26px; }
.skm-loading { color: var(--skm-muted); padding: 40px 0; text-align: center; }

.skm-empty {
  min-height: 60%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  padding: 40px 20px;
}
.skm-emptyIcon { color: var(--skm-brand); opacity: .85; }
.skm-empty h2 { margin: 4px 0 0; font-size: 18px; }
.skm-empty p { margin: 0 0 6px; color: var(--skm-muted); max-width: 460px; font-size: 13px; }

.skm-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 9px 12px;
  border-radius: 9px;
  font-size: 13px;
}
.skm-banner.is-bad { color: var(--skm-danger); border: 1px solid color-mix(in srgb, var(--skm-danger) 38%, transparent); background: color-mix(in srgb, var(--skm-danger) 7%, transparent); }
.skm-linkBtn { border: 0; background: transparent; color: inherit; font: inherit; font-weight: 600; text-decoration: underline; cursor: pointer; }

.skm-detail { display: flex; flex-direction: column; gap: 14px; min-height: 100%; }
.skm-detailHead { display: flex; flex-direction: column; gap: 9px; }
.skm-titleRow { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.skm-detailTitle { margin: 0; font-size: 20px; line-height: 1.25; font-weight: 680; word-break: break-word; }
.skm-detailDesc { margin: 0; color: var(--skm-muted); font-size: 13px; white-space: pre-wrap; }
.skm-status {
  font-size: 11px;
  line-height: 1.8;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid var(--skm-border);
  color: var(--skm-muted);
  white-space: nowrap;
}
.skm-status.is-ok { color: var(--skm-ok); border-color: color-mix(in srgb, var(--skm-ok) 40%, transparent); }
.skm-status.is-bad { color: var(--skm-danger); border-color: color-mix(in srgb, var(--skm-danger) 40%, transparent); }
.skm-status.is-warn { color: var(--skm-warn); border-color: color-mix(in srgb, var(--skm-warn) 40%, transparent); }
.skm-status.is-command { color: var(--skm-brand); border-color: color-mix(in srgb, var(--skm-brand) 40%, transparent); font-family: var(--dsw-alias-font-mono, ui-monospace, Consolas, monospace); }

.skm-pathLine { display: flex; align-items: center; gap: 8px; min-width: 0; }
.skm-pathLabel { color: var(--skm-muted); font-size: 12px; flex: 0 0 auto; }
.skm-pathText {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 7px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--skm-text) 6%, transparent);
  font-family: var(--dsw-alias-font-mono, ui-monospace, Consolas, monospace);
  font-size: 11.5px;
  color: var(--skm-muted);
}
.skm-pathText.is-block { display: block; white-space: normal; word-break: break-all; margin: 6px 0 0; }
.skm-copied { color: var(--skm-ok); font-size: 11.5px; flex: 0 0 auto; }

.skm-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.skm-spacer { flex: 1 1 auto; }
.skm-switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; user-select: none; position: relative; }
.skm-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.skm-switchTrack {
  width: 34px;
  height: 20px;
  border-radius: 999px;
  background: var(--skm-border);
  position: relative;
  flex: 0 0 auto;
  transition: background .15s;
}
.skm-switchThumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--skm-on-brand);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .22);
  transition: transform .15s;
}
.skm-switch input:checked + .skm-switchTrack { background: var(--skm-brand); }
.skm-switch input:checked + .skm-switchTrack .skm-switchThumb { transform: translateX(14px); }
.skm-switch input:focus-visible + .skm-switchTrack { outline: 2px solid var(--skm-brand); outline-offset: 2px; }
.skm-switchText { white-space: nowrap; }

.skm-cmdEdit {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 4px 2px 8px;
  border: 1px solid var(--skm-border);
  border-radius: 8px;
  background: var(--skm-bg);
  color: var(--skm-muted);
}
.skm-cmdEdit:focus-within { border-color: var(--skm-brand); }
.skm-slash { font-family: var(--dsw-alias-font-mono, ui-monospace, Consolas, monospace); font-size: 12.5px; }
.skm-input {
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--skm-border);
  border-radius: 8px;
  background: var(--skm-bg);
  color: var(--skm-text);
  font: inherit;
}
.skm-input:focus-visible { outline: 2px solid var(--skm-brand); outline-offset: 1px; }
.skm-input.is-small {
  width: 190px;
  padding: 3px 2px;
  border: 0;
  background: transparent;
  font-family: var(--dsw-alias-font-mono, ui-monospace, Consolas, monospace);
  font-size: 12.5px;
}
.skm-input.is-small:focus-visible { outline: 0; }
.skm-input:disabled { opacity: .55; }

.skm-error { margin: 0; color: var(--skm-danger); font-size: 12.5px; }
.skm-inlineWarn { margin: 0; color: var(--skm-warn); font-size: 12px; }
.skm-muted { margin: 0; color: var(--skm-muted); font-size: 12.5px; }
.skm-sidebarPad { padding: 4px; }

.skm-audit {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--skm-border);
  border-left: 3px solid var(--skm-muted);
  border-radius: 10px;
  background: var(--skm-surface);
}
.skm-audit.is-ok { border-left-color: var(--dsw-alias-state-success-primary, #2e9e5b); }
.skm-audit.is-bad { border-left-color: var(--skm-danger); }
.skm-audit.is-compact { padding: 10px 12px; }
.skm-auditHead { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.skm-engine { margin-left: auto; color: var(--skm-muted); font-size: 11px; border: 1px solid var(--skm-border); border-radius: 999px; padding: 0 8px; white-space: nowrap; }
.skm-auditMeta { display: flex; flex-wrap: wrap; gap: 4px 18px; margin: 0; font-size: 12px; color: var(--skm-muted); }
.skm-auditMeta div { display: flex; gap: 6px; min-width: 0; }
.skm-auditMeta dt { color: var(--skm-muted); }
.skm-auditMeta dd { margin: 0; color: var(--skm-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 340px; }
.skm-auditBlock h4 { margin: 0 0 4px; font-size: 12px; }
.skm-auditBlock ul { margin: 0; padding-left: 18px; font-size: 12.5px; color: var(--skm-danger); }
.skm-auditBlock.is-warn ul { color: var(--skm-warn); }
.skm-auditClean { margin: 0; color: var(--skm-ok); font-size: 12.5px; }
.skm-auditDialogMeta { margin: 0; color: var(--skm-muted); font-size: 12.5px; }
.skm-auditDialogList { margin: 0; padding-left: 18px; color: var(--skm-danger); font-size: 12.5px; }

.skm-files {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 12px;
  min-height: 360px;
}
.skm-treePanel, .skm-editorPanel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--skm-border);
  border-radius: var(--skm-radius);
  background: var(--skm-surface);
  overflow: hidden;
}
.skm-panelHead {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  border-bottom: 1px solid var(--skm-border);
  font-size: 12.5px;
  font-weight: 650;
  color: var(--skm-muted);
  flex: 0 0 auto;
  min-width: 0;
}
.skm-panelHead > .skm-panelMeta { margin-left: auto; }
.skm-panelMeta { font-weight: 400; font-size: 11.5px; color: var(--skm-muted); white-space: nowrap; }
.skm-treeScroll { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 5px; }
.skm-tree { list-style: none; margin: 0; padding: 0; }
.skm-treeRow {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 4px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
  min-width: 0;
}
.skm-treeRow:hover { background: color-mix(in srgb, var(--skm-brand) 8%, transparent); }
.skm-treeRow.is-active { background: color-mix(in srgb, var(--skm-brand) 14%, transparent); color: var(--skm-brand); }
.skm-treeRow.is-binary { opacity: .6; }
.skm-treeName { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.skm-treeFlag { margin-left: auto; font-size: 10px; color: var(--skm-muted); }
.skm-treeEmpty { color: var(--skm-muted); font-size: 12.5px; padding: 8px; }

.skm-editorBody { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.skm-editor {
  flex: 1 1 auto;
  min-height: 260px;
  width: 100%;
  border: 0;
  outline: 0;
  resize: none;
  padding: 12px 14px;
  background: var(--skm-bg);
  color: var(--skm-text);
  font-family: var(--dsw-alias-font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  font-size: 12.5px;
  line-height: 1.65;
  tab-size: 2;
}
.skm-editor:focus-visible { outline: 0; }
.skm-editorError { padding: 14px; }
.skm-fileTitle {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 52%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--dsw-alias-font-mono, ui-monospace, Consolas, monospace);
  font-size: 12px;
  font-weight: 500;
  color: var(--skm-text);
}
.skm-dirty {
  flex: 0 0 auto;
  font-size: 10.5px;
  line-height: 1.7;
  padding: 0 7px;
  border-radius: 999px;
  color: var(--skm-warn);
  border: 1px solid color-mix(in srgb, var(--skm-warn) 40%, transparent);
}

.skm-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 18, 24, .48);
  color: var(--skm-text);
}
.skm-dialog {
  width: min(560px, 100%);
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--skm-border);
  border-radius: 14px;
  background: var(--skm-bg);
  color: var(--skm-text);
  box-shadow: 0 18px 60px rgba(0, 0, 0, .28);
  overflow: hidden;
}
.skm-addDialog { width: min(720px, 100%); }
.skm-dialogHead {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--skm-border);
  flex: 0 0 auto;
}
.skm-dialogHead h2 { margin: 0; font-size: 15.5px; flex: 1 1 auto; min-width: 0; }
.skm-dialogIcon {
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: var(--skm-brand);
  background: color-mix(in srgb, var(--skm-brand) 14%, transparent);
}
.skm-confirm.is-danger .skm-dialogIcon { color: var(--skm-danger); background: color-mix(in srgb, var(--skm-danger) 12%, transparent); }
.skm-dialogBody { padding: 15px 16px; overflow: auto; display: flex; flex-direction: column; gap: 10px; font-size: 13px; }
.skm-dialogBody p { margin: 0; }
.skm-dialogFoot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 11px 16px;
  border-top: 1px solid var(--skm-border);
  flex: 0 0 auto;
}
.skm-hint { margin: 0; color: var(--skm-muted); font-size: 12.5px; line-height: 1.55; }
.skm-hint.is-small { font-size: 12px; opacity: .9; }
.skm-fieldLabel { font-size: 12px; font-weight: 600; color: var(--skm-muted); }
.skm-pathRow { display: flex; gap: 8px; align-items: stretch; }
.skm-pathRow .skm-input { flex: 1 1 auto; }

.skm-toast {
  position: fixed;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  z-index: 70;
  padding: 9px 18px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-overlay, #1f2328);
  color: var(--dsw-alias-label-primary, #fff);
  font-size: 13px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, .3);
  max-width: min(80vw, 520px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


.skm-settingsBtn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--skm-border);
  background: var(--skm-surface);
}
.skm-settingsBtn:hover { border-color: var(--skm-brand); }
.skm-settingsDialog { width: min(760px, 100%); }
.skm-settingsBody { gap: 0; padding: 0 18px; }
.skm-settingsSection {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 0;
  border-bottom: 1px solid var(--skm-border);
}
.skm-settingsSection:last-child { border-bottom: 0; }
.skm-settingsSection h3 { margin: 0; font-size: 13px; font-weight: 650; }
.skm-settingsSectionHead { display: flex; align-items: center; gap: 8px; }
.skm-settingsSectionHead h3 { flex: 0 0 auto; }
.skm-settingsRow { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.skm-settingsLabel { color: var(--skm-muted); font-size: 12.5px; min-width: 58px; }
.skm-segmented {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--skm-border);
  border-radius: 9px;
  background: var(--skm-bg);
}
.skm-segmented button {
  padding: 5px 11px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--skm-muted);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
}
.skm-segmented button:hover { color: var(--skm-text); background: var(--skm-surface); }
.skm-segmented button.is-active { color: var(--skm-on-brand); background: var(--skm-brand); }
.skm-rangeRow { display: flex; align-items: center; gap: 10px; }
.skm-range { flex: 1 1 auto; min-width: 120px; accent-color: var(--skm-brand); }
.skm-rangeValue { min-width: 64px; text-align: right; font-variant-numeric: tabular-nums; color: var(--skm-muted); font-size: 12.5px; }
.skm-infoGrid {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 7px 12px;
  margin: 0;
  font-size: 12.5px;
}
.skm-infoGrid dt { color: var(--skm-muted); }
.skm-infoGrid dd { margin: 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.skm-infoPath { display: flex; align-items: center; gap: 4px; }
.skm-infoPath > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.skm-configEditor {
  width: 100%;
  min-height: 220px;
  resize: vertical;
  padding: 10px 12px;
  border: 1px solid var(--skm-border);
  border-radius: 9px;
  background: var(--skm-bg);
  color: var(--skm-text);
  font-family: var(--dsw-alias-font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  font-size: 12px;
  line-height: 1.55;
  tab-size: 2;
}
.skm-configEditor:focus-visible { outline: 2px solid var(--skm-brand); outline-offset: 1px; }

@media (max-width: 980px) {
  .skm-body { grid-template-columns: 250px minmax(0, 1fr); }
  .skm-files { grid-template-columns: 220px minmax(0, 1fr); }
}
@media (max-width: 760px) {
  .skm-header { flex-direction: column; align-items: stretch; padding: 14px; }
  .skm-headerActions { justify-content: flex-end; }
  .skm-body { grid-template-columns: 1fr; }
  .skm-sidebar { max-height: 220px; border-right: 0; border-bottom: 1px solid var(--skm-border); }
  .skm-list { max-height: 150px; }
  .skm-main { padding: 14px; }
  .skm-files { grid-template-columns: 1fr; min-height: 0; }
  .skm-treePanel { max-height: 200px; }
  .skm-editor { min-height: 240px; }
  .skm-switchText { display: none; }
  .skm-input.is-small { width: 130px; }
}
`
