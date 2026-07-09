#!/bin/bash
# First, insert new theme tokens into the @theme inline block
sed -i.bak -e '/--color-card: var(--card);/a\
  --color-status-healthy: #6493b5;\
  --color-status-warning: #cba64b;\
  --color-status-danger: #b95766;\
  --color-status-neutral: #64748b;\
  --color-surface-base: #08111f;\
  --color-surface-input: rgba(15, 23, 36, 0.6);\
  --color-surface-border: rgba(100, 147, 181, 0.1);\
  --color-surface-border-subtle: rgba(255, 255, 255, 0.05);\
  --color-surface-text: #f8fafc;\
  --color-surface-text-muted: #64748b;\
  --color-accent-primary: #6493b5;\
' apps/web/app/globals.css
