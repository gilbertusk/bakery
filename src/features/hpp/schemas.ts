import { z } from 'zod';

export const ubahHargaJualSchema = z.object({
  id: z.uuid(),
  hargaJual: z.coerce.number().int().nonnegative(),
});

export type UbahHargaJualData = z.output<typeof ubahHargaJualSchema>;
