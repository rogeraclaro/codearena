---
phase: 03
slug: joc-fases-css-i-js
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-05
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client → server (socket, `TEAM_SET_CSS`) | Payload no confiable; identitat SEMPRE de `socket.data.teamId`, mai del payload | Valor de forat CSS (color/rang) |
| client → server (socket, `TEAM_SET_RULES`) | Payload no confiable; identitat de `socket.data.teamId`; vocabulari revalidat contra taules frozen | Ruleset JS (event/origen/destí/acció) |
| desplegables → intèrpret JS | Els valors dels `<select>` són NOMÉS claus a taules frozen (`JS_EVENTS`/`JS_ELEMENTS`/`ACTIONS`/`COMPOSITES`); clau desconeguda = no-op, mai codi | Claus de vocabulari tancat |
| valor de forat → CSSOM | El valor ha de passar validació servidor abans d'emmagatzemar-se; s'aplica només via `setProperty` (mai text CSS concatenat) | Valor CSS validat |
| parent → iframe (contentDocument) | Codi parent confiat; iframe scriptless (`allow-same-origin`, sense `allow-scripts`) — pura superfície de render | Markup assemblat (sanejat) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-03-01 | Tampering | `TEAM_SET_CSS` value → CSSOM | high | mitigate | `CSS_HOLES[holeId].validate` (hex regex / numèric-dins-rang) al servidor abans d'emmagatzemar; client aplica només via `element.style.setProperty()` — `src/server/gameState.js:146-148`, `src/client/client.js:986` | closed |
| T-03-02 | Spoofing/Tampering | `setCssValue` cross-team | high | mitigate | Identitat de `socket.data.teamId` (middleware), mai del payload — `src/server/socketHandlers.js:272,280` | closed |
| T-03-03 | DoS | broadcast storm en `input` continu | medium | mitigate | `mutation-returns-bool` + emissió dirigida `team:<id>`; emet només en `change`, mai en cada frame `input` | closed |
| T-03-04 | Elevation | iframe unsandboxing (CSS) | high | mitigate | `sandbox="allow-same-origin"` únic, sense `allow-scripts` — `src/client/client.js:1467` | closed |
| T-03-05 | Tampering | XSS via markup assemblat (CSS) | medium | mitigate | DOMPurify sense canvis a `assemblePreview`; forats només toquen custom properties/`style`, mai `innerHTML` — `src/client/client.js:964` | closed |
| T-03-06 | DoS | payload malformat crashant el procés compartit (CSS) | medium | mitigate | Handler embolcallat amb `safeHandler` existent + validació typeof — `src/server/socketHandlers.js:16,279` | closed |
| T-03-07 | Elevation | execució de codi via regles "JS" | high | mitigate | Cap `eval`/`Function`/construcció de codi (confirmat: cap coincidència al repo); taula de despatx frozen (`JS_ACTION_KEYS`, `ACTIONS`, `COMPOSITES`) keyed per vocabulari tancat; clau desconeguda = no-op — `src/shared/robotTemplate.js:343`, `src/shared/effects.js:20,34`, `src/server/gameState.js:186-188` | closed |
| T-03-08 | Elevation | iframe unsandboxing (JS) | high | mitigate | Mateix `sandbox="allow-same-origin"` únic; intèrpret viu al parent, no dins l'iframe — `src/client/client.js:1467` | closed |
| T-03-09 | Spoofing/Tampering | `setJsRules` cross-team (teamId forjat) | high | mitigate | Identitat de `socket.data.teamId`, mai del payload — `src/server/socketHandlers.js:302` | closed |
| T-03-10 | Tampering | vocabulari/estructura de regla forjats | medium | mitigate | Revalidació de cada camp contra enums frozen + anti-repeat (event,origen) + límit ≤6 + composite⇒destí null — `src/server/gameState.js:177-197` | closed |
| T-03-11 | Tampering | XSS via efectes sobre el DOM del preview | medium | mitigate | Efectes muten només `style`/`classList`/`visibility`, mai `innerHTML`; DOMPurify sense canvis — `src/shared/effects.js:36-48`, `src/client/client.js:932,964` | closed |
| T-03-12 | DoS | payload malformat / storm de re-render (JS) | medium | mitigate | `safeHandler` + `mutation-returns-bool` + emissió dirigida `team:<id>`; whole-array replace (≤6 regles) — `src/server/socketHandlers.js:302`, `src/server/gameState.js:170-172` | closed |

*Status: open · closed · open — below {block_on} threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-05 | 12 | 12 | 0 | gsd-secure-phase (L1 grep-depth verification, ASVS level 1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-05
