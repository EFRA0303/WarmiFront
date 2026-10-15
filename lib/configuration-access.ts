import type { CurrentUser } from '@/lib/types';

const CONFIGURATION_ROLES = new Set(['ROOT', 'ADMINISTRADOR']);

export function isConfigurationAdmin(
  user: Pick<CurrentUser, 'rol'> | null | undefined,
) {
  return CONFIGURATION_ROLES.has(user?.rol?.nombre?.trim().toUpperCase() ?? '');
}
