import type { Role, TaskRolesPluginSettings } from "../types";
import { DEFAULT_ROLES } from "../types";

export function getPreferredNameOptions(role: Role): string[] {
  const names = role.names ?? [];
  // ensure unique and preserve order
  const seen = new Set<string>();
  return names.filter((n) => {
    const key = String(n);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getShortcutOptions(role: Role): string[] {
  const keys = (role.shortcuts ?? []).filter((v): v is string => Boolean(v));
  const seen = new Set<string>();
  return keys.filter((k) => {
    const key = k.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isIconUnique(
  icon: string,
  settings: TaskRolesPluginSettings,
  forRoleId?: string
): boolean {
  const normalized = icon?.trim();
  if (!normalized) return true;

  const defaultIds = new Set(DEFAULT_ROLES.map((r) => r.id));
  return !settings.roles.some((r) => {
    if (forRoleId && r.id === forRoleId) return false; // allow same role
    // Skip hidden default roles
    if (defaultIds.has(r.id) && settings.hiddenDefaultRoles.includes(r.id)) return false;
    return r.icon === normalized;
  });
}
