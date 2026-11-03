type Level = 'info' | 'warn' | 'error';
type Konteks = Record<string, unknown> & { error?: unknown };

function serialisasiError(error: unknown): unknown {
  if (!(error instanceof Error)) return error;
  const { name, message, stack } = error;
  const ekstra = Object.fromEntries(Object.entries(error));
  return {
    ...ekstra,
    name,
    message,
    stack,
    ...(error.cause !== undefined ? { cause: serialisasiError(error.cause) } : {}),
  };
}

function tulis(level: Level, pesan: string, konteks: Konteks = {}) {
  const { error, ...lainnya } = konteks;
  const baris = JSON.stringify({
    waktu: new Date().toISOString(),
    level,
    pesan,
    ...lainnya,
    ...(error !== undefined ? { error: serialisasiError(error) } : {}),
  });
  console[level](baris);
}

/** Logger server: JSON satu baris per kejadian. Pakai ini, bukan console.log, di kode fitur. */
export const log = {
  info: (pesan: string, konteks?: Konteks) => tulis('info', pesan, konteks),
  warn: (pesan: string, konteks?: Konteks) => tulis('warn', pesan, konteks),
  error: (pesan: string, konteks?: Konteks) => tulis('error', pesan, konteks),
};
