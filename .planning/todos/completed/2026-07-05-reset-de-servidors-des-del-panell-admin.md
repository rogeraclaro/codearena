---
created: 2026-07-05T00:00:00.000Z
title: Reset de servidors des del panell Admin
area: ui
files:
  - src/server/index.js
  - admin.html (panell Admin)
---

## Problem

Durant les sessions de UAT manual de la Fase 03, ha calgut diverses vegades
matar i reengegar manualment `npm run server` + `npm run dev` (via terminal)
per netejar un estat de sessió/HMR encallat (per exemple: un bug ja corregit
al codi que seguia semblant reproduir-se fins que es reiniciaven els
processos). L'usuari ha demanat que això s'incorpori com a funcionalitat:
poder fer un "reset" complet des del panell d'Admin, sense necessitat
d'accedir a un terminal.

## Solution

TBD — a decidir quin abast té el "reset":

- Opció mínima: un botó a l'Admin que reinicia només l'ESTAT DE JOC en
  memòria (equips, fase, timer) tornant a l'estat inicial — no requereix
  reiniciar el procés Node, només crida una funció equivalent a recarregar
  `gameState` des de zero. Més segur, no talla cap connexió WebSocket.
- Opció completa: un mecanisme perquè l'Admin pugui demanar un restart real
  del procés servidor (p.ex. si PM2 gestiona el procés en producció, cridar
  `pm2 restart`; en dev, sortir del procés amb un exit code que un supervisor
  reengegui). Més arriscat — talla totes les connexions actives.
- Cal decidir si aquest botó ha d'existir només en entorn de desenvolupament
  (perillós en producció durant una classe real) o si mai s'hauria d'exposar
  fora de dev.
