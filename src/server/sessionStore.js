// In-memory session store: maps a server-minted, cryptographically random
// token (crypto.randomUUID, never Math.random) to the teamId it identifies.
// This is the durable "who is this browser tab" identity — never bound to
// socket.id, which changes on every reconnect (CORE-02/D-02).

import { randomUUID } from 'node:crypto';

const tokenToTeamId = new Map();

export function mintToken(teamId) {
  const token = randomUUID();
  tokenToTeamId.set(token, teamId);
  return token;
}

export function resolve(token) {
  return tokenToTeamId.get(token);
}

export function tokenFor(teamId) {
  for (const [token, id] of tokenToTeamId) {
    if (id === teamId) return token;
  }
  return undefined;
}
