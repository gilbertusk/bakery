const TUJUAN_DEFAULT = '/dashboard';

export function tujuanSetelahLogin(path?: string | null): string {
  if (!path || !path.startsWith('/')) return TUJUAN_DEFAULT;
  if (path.startsWith('//') || path.startsWith('/\\')) return TUJUAN_DEFAULT;
  if (/[\u0000-\u001f]/.test(path)) return TUJUAN_DEFAULT;
  return path;
}
