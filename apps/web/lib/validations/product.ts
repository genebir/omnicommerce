import { z } from "zod/v3";

export const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  price: z.coerce.number().min(0),
  description: z.string().optional(),
  stock: z.coerce.number().int().min(0).optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
