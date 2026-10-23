export const CSS = `
.dshdb-root {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  font-family: var(--dsw-font-family, system-ui, -apple-system, "Segoe UI", sans-serif);
  font-size: 12px;
  line-height: 18px;
  overflow: hidden;
}

/* Glyphs are flex children all over this panel. A block-level svg drops the
   descender gap an inline one leaves, so an icon and the text beside it share
   one centre line instead of the glyph riding high. */
.dshdb-root svg { display: block; }

/* IDEA 风格工具窗口工具栏：按钮左对齐，右侧放视图切换 */
.dshdb-toolbar-top {
  padding: 5px 8px;
  gap: 2px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
}
.dshdb-toolbtn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 7px;
  flex: none;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-family: inherit;
  font-size: 12px;
  /* The UA font shorthand on <button> leaves line-height at normal, whose extra
     line gap pushes the glyph 1px below the icon. Pinning the line box to the
     font content height keeps label and icon on one optical centre. */
  line-height: 15px;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.dshdb-toolbtn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.dshdb-toolbtn:disabled { opacity: 0.45; cursor: default; }
.dshdb-toolbtn svg { flex: none; color: var(--dsw-alias-label-tertiary); }
.dshdb-toolbtn:hover:not(:disabled) svg { color: var(--dsw-alias-label-primary); }

.dshdb-tab {
  height: 24px;
  padding: 0 9px;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.dshdb-tab:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshdb-tab[data-active="true"] {
  background: var(--dsw-alias-interactive-bg-active);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.dshdb-main {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
}
.dshdb-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px 10px 12px;
}
.dshdb-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  height: 100%;
}
.dshdb-view-hidden { display: none; }

.dshdb-panel {
  display: flex;
  flex-direction: column;
  flex: none;
  min-height: 0;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  overflow: hidden;
}
.dshdb-panel-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  flex: none;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.dshdb-panel-head-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: none;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}
.dshdb-panel-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
.dshdb-panel-body-pad { padding: 8px; }

.dshdb-tree {
  display: flex;
  flex-direction: column;
  padding: 2px 4px 6px;
  min-height: 0;
  overflow: auto;
  flex: 1;
}
.dshdb-row {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  box-sizing: border-box;
  min-height: 24px;
  padding: 0 6px 0 calc(4px + var(--dshdb-depth, 0) * 12px);
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.dshdb-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-row:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: -2px;
  border-radius: 4px;
}

.dshdb-row[data-active="true"] {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent);
  color: var(--dsw-alias-label-primary);
  box-shadow: inset 2px 0 0 var(--dsw-alias-state-business-primary);
}
.dshdb-row[data-active="true"] .dshdb-row-meta { color: inherit; opacity: 0.8; }
.dshdb-row-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  flex: none;
  color: var(--dsw-alias-label-tertiary);
}
.dshdb-row-toggle-action {
  width: 16px;
  height: 16px;
  margin: 0 -1px;
  border-radius: var(--dsw-radius-xs);
  cursor: pointer;
}
.dshdb-row-toggle-action:hover {
  background: var(--dsw-alias-interactive-bg-active);
  color: var(--dsw-alias-label-primary);
}
.dshdb-row-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshdb-row-meta {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.dshdb-row-icon { display: inline-flex; align-items: center; flex: none; color: var(--dsw-alias-label-tertiary); }

/* Row-end affordances: connect text and the database/schema visibility picker. */
.dshdb-row-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  height: 18px;
  min-width: 18px;
  padding: 0 4px;
  border-radius: var(--dsw-radius-xs);
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.75;
}
.dshdb-row:hover .dshdb-row-action,
.dshdb-row-action:focus-visible { opacity: 1; }
.dshdb-row-action:hover {
  background: var(--dsw-alias-interactive-bg-active);
  color: var(--dsw-alias-label-primary);
}
.dshdb-connect-action {
  color: var(--dsw-alias-state-business-primary);
  opacity: 1;
  font-weight: 500;
}
.dshdb-picker-anchor { position: relative; display: inline-flex; flex: none; }
.dshdb-picker {
  position: absolute;
  top: calc(100% + 2px);
  right: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  min-width: 200px;
  max-height: 280px;
  padding: 4px;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-md);
  box-shadow: var(--dsw-alias-shadow-md);
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  text-align: left;
}
.dshdb-picker-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: var(--dsw-radius-xs);
  cursor: pointer;
  white-space: nowrap;
}
.dshdb-picker-item:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-picker-item input {
  margin: 0;
  flex: none;
  accent-color: var(--dsw-alias-state-business-primary);
}
.dshdb-picker-all {
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-xs) var(--dsw-radius-xs) 0 0;
  padding-bottom: 6px;
  margin-bottom: 2px;
  font-weight: 500;
}
.dshdb-picker-all em {
  margin-left: auto;
  font-style: normal;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}
.dshdb-picker-scroll { overflow: auto; min-height: 0; }
.dshdb-picker-hint {
  margin-top: 2px;
  padding: 4px 6px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.dshdb-mark {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

.dshdb-row[data-kind="view"] .dshdb-row-icon { color: var(--dsw-alias-state-business-secondary, var(--dsw-alias-label-tertiary)); }
.dshdb-row[data-kind="datasource"] .dshdb-row-label { font-weight: 500; }

.dshdb-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
.dshdb-detail-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-weight: 600;
}
.dshdb-detail-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshdb-kv {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 3px 12px;
  padding: 8px;
  font-size: 12px;
}
.dshdb-kv-key { color: var(--dsw-alias-label-tertiary); }
.dshdb-kv-val { color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.dshdb-mono { font-family: var(--ds-font-family-code, ui-monospace, "SF Mono", Menlo, Consolas, monospace); font-size: 11.5px; }

.dshdb-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex: none;
}
.dshdb-toolbar-spacer { flex: 1; }

.dshdb-editor-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: none;
}
.dshdb-editor {
  width: 100%;
  min-height: 132px;
  max-height: 46vh;
  resize: vertical;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, ui-monospace, "SF Mono", Menlo, Consolas, monospace);
  font-size: 12px;
  line-height: 1.55;
  tab-size: 2;
  outline: none;
}
.dshdb-editor:focus { border-color: var(--dsw-alias-state-business-primary); }
.dshdb-editor::placeholder { color: var(--dsw-alias-label-dimmed); }

.dshdb-grid-wrap {
  min-height: 0;
  overflow: auto;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  flex: 1;
}
.dshdb-grid {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
  font-family: var(--ds-font-family-code, ui-monospace, "SF Mono", Menlo, Consolas, monospace);
  font-size: 11.5px;
}
.dshdb-grid th {
  position: sticky;
  top: 0;
  z-index: 1;
  height: 24px;
  box-sizing: border-box;
  background: var(--dsw-alias-bg-layer-2);
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
  padding: 0 8px;
  text-align: left;
  color: var(--dsw-alias-label-secondary);
  font-weight: 500;
  line-height: 23px;
  white-space: nowrap;
}
.dshdb-grid td {
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
  height: 22px;
  box-sizing: border-box;
  padding: 0 8px;
  color: var(--dsw-alias-label-primary);
  line-height: 21px;
  white-space: nowrap;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dshdb-grid tbody tr { height: 22px; }
.dshdb-grid.dshdb-grid-sized { table-layout: fixed; width: 100%; }
.dshdb-th-sortable { cursor: pointer; user-select: none; }
.dshdb-th-sortable:hover { color: var(--dsw-alias-label-primary); }
.dshdb-grid th[data-sorted] { color: var(--dsw-alias-label-primary); }
.dshdb-sort-arrow {
  margin-left: 4px;
  font-size: 9px;
  vertical-align: 1px;
  color: var(--dsw-alias-brand-primary);
}
.dshdb-grid-sized td { overflow: hidden; text-overflow: ellipsis; }
.dshdb-grip {
  position: absolute;
  top: 0;
  right: -3px;
  bottom: 0;
  width: 7px;
  z-index: 3;
  cursor: col-resize;
}
.dshdb-grip::after {
  content: '';
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 3px;
  width: 1px;
  background: transparent;
}
.dshdb-grip:hover::after {
  background: var(--dsw-alias-business-primary);
}
.dshdb-vpad td { padding: 0 !important; border: 0 !important; }
.dshdb-grid tr:hover td { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-grid .dshdb-num {
  color: var(--dsw-alias-label-dimmed);
  text-align: right;
  user-select: none;
  width: 1%;
}
.dshdb-null { color: var(--dsw-alias-label-dimmed); font-style: italic; }
.dshdb-cell-filterable { cursor: pointer; }
.dshdb-filter-row th {
  position: sticky;
  top: 24px;
  z-index: 1;
  height: 26px;
  padding: 2px 4px;
  line-height: normal;
  background: var(--dsw-alias-bg-layer-2);
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}
.dshdb-filter-box {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
  height: 20px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
}
.dshdb-filter-box-active { border-color: var(--dsw-alias-brand-primary); }
.dshdb-filter-input {
  flex: 1;
  min-width: 40px;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, ui-monospace, Menlo, Consolas, monospace);
  font-size: 10.5px;
}
.dshdb-filter-input:focus { outline: none; }
.dshdb-filter-input::placeholder { color: var(--dsw-alias-label-dimmed); }
.dshdb-filter-clear {
  flex: none;
  border: 0;
  background: transparent;
  padding: 0 2px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}
.dshdb-filter-clear:hover { color: var(--dsw-alias-label-primary); }
.dshdb-filter-count {
  margin-left: 2px;
  padding: 0 3px;
  border-radius: 6px;
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-on-primary, #fff);
  font-size: 9px;
  line-height: 12px;
}
.dshdb-pager-btn-active {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
}
.dshdb-menu-wrap { position: relative; display: inline-flex; }
.dshdb-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-width: 190px;
  padding: 4px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: var(--dsw-alias-shadow-md, 0 6px 20px rgba(0, 0, 0, 0.14));
}
.dshdb-menu button {
  padding: 5px 8px;
  border: 0;
  background: transparent;
  border-radius: var(--dsw-radius-sm);
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 12px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}
.dshdb-menu button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-hmenu {
  position: fixed;
  z-index: 40;
  display: flex;
  flex-direction: column;
  min-width: 190px;
  padding: 4px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: var(--dsw-alias-shadow-md, 0 6px 20px rgba(0, 0, 0, 0.14));
}
.dshdb-hmenu button {
  padding: 5px 8px;
  border: 0;
  background: transparent;
  border-radius: var(--dsw-radius-sm);
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 12px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}
.dshdb-hmenu button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-hmenu button:disabled { color: var(--dsw-alias-label-tertiary); cursor: default; }
.dshdb-grid-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 4px 2px 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}

.dshdb-statusbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  height: 24px;
  padding: 0 10px;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  overflow: hidden;
}
.dshdb-statusbar > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshdb-statusbar-spacer { flex: 1; }

.dshdb-banner {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 8px;
  border-radius: var(--dsw-radius-sm);
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.dshdb-banner[data-tone="error"] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, var(--dsw-alias-border-l2));
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-state-error-primary);
}
.dshdb-banner[data-tone="warn"] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, var(--dsw-alias-border-l2));
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-state-warn-primary);
}
.dshdb-banner[data-tone="success"] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 40%, var(--dsw-alias-border-l2));
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 8%, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-state-success-primary);
}
.dshdb-banner[data-tone="info"] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 36%, var(--dsw-alias-border-l2));
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 7%, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-label-secondary);
}
.dshdb-banner-icon { flex: none; padding-top: 1px; }
.dshdb-banner-text { flex: 1; min-width: 0; white-space: pre-wrap; }

.dshdb-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 28px 18px;
  text-align: center;
  color: var(--dsw-alias-label-tertiary);
  flex: 1;
  min-height: 120px;
}
.dshdb-empty-icon { color: var(--dsw-alias-label-dimmed); margin-bottom: 2px; }
.dshdb-empty-title { color: var(--dsw-alias-label-primary); font-size: 12.5px; font-weight: 500; }
.dshdb-empty-text { font-size: 11.5px; line-height: 1.5; max-width: 280px; }
.dshdb-empty-actions { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; justify-content: center; }

.dshdb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 26px;
  padding: 0 9px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}
.dshdb-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-btn:active { background: var(--dsw-alias-interactive-bg-active); }
.dshdb-btn[data-variant="primary"] {
  border-color: transparent;
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-button-primary-label, var(--dsw-alias-bg-base));
}
.dshdb-btn[data-variant="primary"]:hover { background: var(--dsw-alias-button-primary-hover); }
.dshdb-btn[data-variant="ghost"] { border-color: transparent; background: transparent; color: var(--dsw-alias-label-secondary); }
.dshdb-btn[data-variant="ghost"]:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshdb-btn[data-variant="danger"] { color: var(--dsw-alias-state-error-primary); }
.dshdb-btn[data-density="icon"] { width: 26px; padding: 0; }
.dshdb-btn[data-size="sm"] { height: 22px; padding: 0 7px; font-size: 11.5px; }
.dshdb-btn[data-density="icon"][data-size="sm"] { width: 22px; padding: 0; }
.dshdb-btn:disabled { opacity: 0.45; cursor: default; background: var(--dsw-alias-bg-layer-1); }
.dshdb-btn:focus-visible { outline: 2px solid var(--dsw-alias-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 1px; }

.dshdb-input,
.dshdb-select,
.dshdb-textarea {
  width: 100%;
  box-sizing: border-box;
  height: 26px;
  padding: 0 8px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 12px;
  outline: none;
}
.dshdb-input:focus,
.dshdb-select:focus,
.dshdb-textarea:focus { border-color: var(--dsw-alias-state-business-primary); }
.dshdb-input::placeholder,
.dshdb-textarea::placeholder { color: var(--dsw-alias-label-dimmed); }
.dshdb-select { appearance: none; padding-right: 22px; cursor: pointer;
  background-image: linear-gradient(45deg, transparent 50%, var(--dsw-alias-label-tertiary) 50%),
    linear-gradient(135deg, var(--dsw-alias-label-tertiary) 50%, transparent 50%);
  background-position: calc(100% - 11px) 11px, calc(100% - 7px) 11px;
  background-size: 4px 4px, 4px 4px;
  background-repeat: no-repeat;
}
.dshdb-textarea { height: auto; min-height: 64px; padding: 6px 8px; resize: vertical; line-height: 1.5; }
.dshdb-select-inline { width: auto; min-width: 74px; }

.dshdb-field { display: flex; flex-direction: column; gap: 4px; }
.dshdb-field-label {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
}
.dshdb-field-label em { color: var(--dsw-alias-state-error-primary); font-style: normal; }
.dshdb-field-hint { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 1.45; }
.dshdb-field-error { color: var(--dsw-alias-state-error-primary); font-size: 11px; }

.dshdb-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}
.dshdb-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
}
.dshdb-form-grid > .dshdb-span-2 { grid-column: 1 / -1; }

.dshdb-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}
.dshdb-switch {
  position: relative;
  width: 28px;
  height: 16px;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--dsw-alias-border-l3);
  cursor: pointer;
  transition: background 140ms ease;
}
.dshdb-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--dsw-alias-bg-base);
  box-shadow: var(--dsw-elevation-soft, 0 1px 2px rgba(0, 0, 0, 0.2));
  transition: transform 140ms ease;
}
.dshdb-switch[aria-checked="true"] { background: var(--dsw-alias-state-business-primary); }
.dshdb-switch[aria-checked="true"]::after { transform: translateX(12px); }

.dshdb-tag {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 6px;
  border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-tertiary);
  font-size: 10.5px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.dshdb-tag[data-tone="business"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent); color: var(--dsw-alias-state-business-primary); }
.dshdb-tag[data-tone="success"] { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent); color: var(--dsw-alias-state-success-primary); }
.dshdb-tag[data-tone="warn"] { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 16%, transparent); color: var(--dsw-alias-state-warn-primary); }
.dshdb-tag[data-tone="error"] { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent); color: var(--dsw-alias-state-error-primary); }
.dshdb-tag[data-tone="key"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 16%, transparent); color: var(--dsw-alias-state-business-primary); font-weight: 500; }

.dshdb-dot { width: 6px; height: 6px; border-radius: 50%; flex: none; background: var(--dsw-alias-state-idle-primary); }
.dshdb-dot[data-tone="success"] { background: var(--dsw-alias-state-success-primary); }
.dshdb-dot[data-tone="error"] { background: var(--dsw-alias-state-error-primary); }
.dshdb-dot[data-tone="warn"] { background: var(--dsw-alias-state-warn-primary); }
.dshdb-dot[data-tone="business"] { background: var(--dsw-alias-state-business-primary); }

.dshdb-spinner {
  width: 12px;
  height: 12px;
  flex: none;
  border: 1.5px solid color-mix(in srgb, var(--dsw-alias-label-tertiary) 30%, transparent);
  border-top-color: var(--dsw-alias-state-business-primary);
  border-radius: 50%;
  animation: dshdb-spin 720ms linear infinite;
}
@keyframes dshdb-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .dshdb-spinner { animation-duration: 2400ms; }
  .dshdb-btn, .dshdb-toolbtn, .dshdb-tab, .dshdb-switch, .dshdb-switch::after { transition: none; }
}

.dshdb-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--dsw-alias-bg-mask-1, color-mix(in srgb, var(--dsw-alias-label-primary) 26%, transparent));
}
.dshdb-modal {
  display: flex;
  flex-direction: column;
  width: min(560px, 100%);
  max-height: min(84vh, 720px);
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-base);
  box-shadow: var(--dsw-elevation-prominent, var(--dsw-elevation-panel));
  overflow: hidden;
}
.dshdb-modal-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 10px;
  flex: none;
}
.dshdb-modal-title { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; }
.dshdb-modal-body { padding: 0 14px 12px; overflow: auto; min-height: 0; flex: 1; }
.dshdb-modal-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  flex: none;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
}
.dshdb-modal-foot-spacer { flex: 1; }
.dshdb-modal-message { color: var(--dsw-alias-label-secondary); white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.55; }
.dshdb-modal-message .dshdb-mono { display: block; margin-top: 6px; padding: 8px; border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); white-space: pre-wrap; max-height: 180px; overflow: auto; }

.dshdb-redis-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}
.dshdb-redis-bar .dshdb-input { width: auto; flex: 1; min-width: 80px; }
.dshdb-redis-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  min-height: 0;
  flex: 1;
}
.dshdb-keys {
  max-height: 220px;
  overflow: auto;
}
.dshdb-key-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 24px;
  padding: 0 6px;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, ui-monospace, monospace);
  font-size: 11.5px;
  text-align: left;
  cursor: pointer;
}
.dshdb-key-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-key-row[data-active="true"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent); }
.dshdb-key-row .dshdb-row-label { font-family: inherit; }
.dshdb-json {
  margin: 0;
  padding: 8px;
  max-height: 280px;
  overflow: auto;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, ui-monospace, monospace);
  font-size: 11.5px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.dshdb-command-row { display: flex; align-items: center; gap: 6px; flex: none; }
.dshdb-command-row .dshdb-input { flex: 1; font-family: var(--ds-font-family-code, ui-monospace, monospace); }
.dshdb-muted { color: var(--dsw-alias-label-tertiary); }
.dshdb-danger { color: var(--dsw-alias-state-error-primary); }
.dshdb-inline { display: inline-flex; align-items: center; gap: 4px; }
.dshdb-grow { flex: 1; min-width: 0; }
.dshdb-nowrap { white-space: nowrap; }
.dshdb-scroll-thin { scrollbar-width: thin; }
.dshdb-list { display: flex; flex-direction: column; gap: 6px; }
.dshdb-driver-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
}
.dshdb-driver-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.dshdb-driver-name { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.dshdb-driver-sub { color: var(--dsw-alias-label-tertiary); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshdb-file-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 11.5px; }
.dshdb-file-row .dshdb-mono { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshdb-progress {
  height: 3px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2);
  overflow: hidden;
  flex: none;
}
.dshdb-progress-inner { height: 100%; background: var(--dsw-alias-state-business-primary); animation: dshdb-indeterminate 1.2s ease-in-out infinite; width: 40%; }
@keyframes dshdb-indeterminate { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }

/* One table's rows in their own Sidebar tab (IDEA-style data page). */
.dshdb-qtab { display: flex; flex-direction: column; gap: 6px; height: 100%; min-height: 0; padding: 8px 10px 10px; box-sizing: border-box; }
.dshdb-qbar { display: flex; align-items: center; gap: 6px; flex: none; min-height: 22px; }
.dshdb-qtable {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshdb-qbar-spacer { flex: 1; }
/* Executed-statement history, dropped in below the editor while open. */
.dshdb-history {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: none;
  max-height: 168px;
  padding: 6px 6px 4px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
}
.dshdb-history-head { display: flex; align-items: center; justify-content: space-between; padding: 0 2px 2px; }
.dshdb-history-title { color: var(--dsw-alias-label-tertiary); font-size: 10px; letter-spacing: 0.4px; }
.dshdb-history-list { display: flex; flex-direction: column; overflow: auto; min-height: 0; }
.dshdb-history-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 4px 6px;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-family: var(--ds-font-family-code, ui-monospace, Menlo, Consolas, monospace);
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}
.dshdb-history-group { display: flex; flex-direction: column; gap: 2px; }
.dshdb-history-line { display: flex; align-items: center; gap: 2px; }
.dshdb-history-line .dshdb-history-row { flex: 1; min-width: 0; }
.dshdb-history-star {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
}
.dshdb-history-star:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); }
.dshdb-history-star[data-pinned="true"] { color: var(--dsw-alias-state-business-primary); }
.dshdb-history-empty { padding: 6px 4px; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.dshdb-history-row:hover { background: var(--dsw-alias-bg-layer-2); }
.dshdb-history-sql { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshdb-history-time { flex: none; color: var(--dsw-alias-label-tertiary); font-family: inherit; font-size: 10px; }
.dshdb-qmeta { color: var(--dsw-alias-label-tertiary); font-size: 10.5px; font-variant-numeric: tabular-nums; }
.dshdb-qfilter {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
  padding: 3px 4px 3px 0;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
}
.dshdb-qfilter-label {
  flex: none;
  padding-left: 8px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  letter-spacing: 0.4px;
  white-space: nowrap;
}
.dshdb-qfilter-input { flex: 1; min-width: 90px; height: 22px; border: 0; background: transparent; font-family: var(--ds-font-family-code, ui-monospace, Menlo, Consolas, monospace); font-size: 11.5px; }
.dshdb-qfilter-input:focus { border: 0; outline: none; }
.dshdb-qfilter-order { flex: 0 1 190px; border-left: 0.5px solid var(--dsw-alias-border-l1); padding-left: 8px; }
.dshdb-pager {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
  padding: 2px 0 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.dshdb-pager-spacer { flex: 1; }
.dshdb-pager-sql { min-width: 0; max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--ds-font-family-code, ui-monospace, Menlo, Consolas, monospace); font-size: 10.5px; }
.dshdb-pager-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 4px;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
  line-height: 1;
  cursor: pointer;
}
.dshdb-pager-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshdb-pager-btn:disabled { opacity: 0.35; cursor: default; }
.dshdb-pager-range { padding: 0 2px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.dshdb-pager-total { color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dshdb-pager-size { width: auto; height: 20px; padding: 0 18px 0 4px; font-size: 10.5px; }
.dshdb-tabtitle { display: inline-flex; align-items: center; gap: 4px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Console tab: an SQL editor on pager chrome, or a Redis key grid plus command box. */
.dshdb-console-input {
  flex: none;
  height: 96px;
  padding: 8px 10px;
  font-family: var(--ds-font-family-code, ui-monospace, "SF Mono", Menlo, Consolas, monospace);
  font-size: 11.5px;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
}
.dshdb-console-select { max-width: 220px; }
.dshdb-console-value {
  flex: none;
  max-height: 150px;
  margin: 0;
  padding: 8px 10px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, ui-monospace, "SF Mono", Menlo, Consolas, monospace);
  font-size: 11px;
  line-height: 1.5;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.dshdb-grid tbody tr[data-active="true"] {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent);
  box-shadow: inset 2px 0 0 var(--dsw-alias-state-business-primary);
}
.dshdb-ddl {
  margin: 0;
  max-height: 380px;
  overflow: auto;
  padding: 10px 12px;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, ui-monospace, "SF Mono", Menlo, Consolas, monospace);
  font-size: 11.5px;
  line-height: 1.6;
  white-space: pre;
  tab-size: 2;
}
.dshdb-redis-value {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 120px;
  overflow: hidden;
  border-top: 1px solid var(--dshdb-border);
  padding-top: 4px;
}

.dshdb-redis-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
  min-width: 0;
}

.dshdb-redis-key {
  margin-left: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dshdb-muted);
  font-family: var(--dshdb-mono);
}

.dshdb-redis-keys {
  flex: 0 1 auto;
  max-height: 38%;
}

.dshdb-redis-table {
  flex: 1 1 auto;
  min-height: 0;
}

`;

const STYLE_ID = 'dsh-ide-database/styles';

export function injectStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  let element = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!element) {
    element = document.createElement('style')
    element.id = STYLE_ID
    element.dataset.plugin = 'dsh-ide-database'
    document.head.appendChild(element)
  }
  element.textContent = CSS
  return () => {
    element?.remove()
  }
}
