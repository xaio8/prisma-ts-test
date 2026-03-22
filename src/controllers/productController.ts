import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { products } from '../db/schema';
import { HttpError } from '../middleware/errorHandler';

const createProductSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  price: z.coerce.number().finite(),
  stock: z.coerce.number().int().min(0).optional()
});

const updateProductSchema = z
  .object({
    sku: z.string().min(1).max(100).optional(),
    name: z.string().min(1).max(200).optional(),
    price: z.coerce.number().finite().optional(),
    stock: z.coerce.number().int().min(0).optional()
  })
  .refine(
    (v) => v.sku !== undefined || v.name !== undefined || v.price !== undefined || v.stock !== undefined,
    { message: 'At least one field must be provided' }
  );

export const productController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50), 200);
      const offset = Math.max(Number(req.query.offset ?? 0), 0);
      const rows = await db
        .select()
        .from(products)
        .limit(limit)
        .offset(offset)
        .orderBy(products.id);
      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid id');

      const rows = await db.select().from(products).where(eq(products.id, id));
      const product = rows[0];
      if (!product) throw new HttpError(404, 'Product not found');
      res.json({ data: product });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createProductSchema.parse(req.body);

      const rows = await db
        .insert(products)
        .values({
          sku: input.sku,
          name: input.name,
          price: input.price,
          stock: input.stock ?? 0
        })
        .returning();

      res.status(201).json({ data: rows[0] });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid id');

      const input = updateProductSchema.parse(req.body);
      const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
      if (!existing) throw new HttpError(404, 'Product not found');

      const updatePayload: Partial<typeof products.$inferInsert> = {};
      if (input.sku !== undefined) updatePayload.sku = input.sku;
      if (input.name !== undefined) updatePayload.name = input.name;
      if (input.price !== undefined) updatePayload.price = input.price;
      if (input.stock !== undefined) updatePayload.stock = input.stock;

      const rows = await db.update(products).set(updatePayload).where(and(eq(products.id, id))).returning();
      res.json({ data: rows[0] });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid id');

      const rows = await db.delete(products).where(eq(products.id, id)).returning();
      if (rows.length === 0) throw new HttpError(404, 'Product not found');
      res.json({ data: { deleted: true, id } });
    } catch (err) {
      next(err);
    }
  }
};
