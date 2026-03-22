import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { HttpError } from '../middleware/errorHandler';
import { products, saleItems, sales, type SaleStatus, users } from '../db/schema';

const createSaleSchema = z.object({
  userId: z.coerce.number().int().positive(),
  status: z.enum(['pending', 'completed']).optional(),
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().positive()
      })
    )
    .min(1)
});

async function getSaleDetails(saleId: number) {
  const [saleRow] = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
  if (!saleRow) throw new HttpError(404, 'Sale not found');

  const [userRow] = await db.select().from(users).where(eq(users.id, saleRow.userId)).limit(1);

  const itemRows = await db
    .select({
      id: saleItems.id,
      saleId: saleItems.saleId,
      productId: saleItems.productId,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      lineTotal: saleItems.lineTotal,
      sku: products.sku,
      productName: products.name
    })
    .from(saleItems)
    .leftJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, saleId));

  return {
    ...saleRow,
    user: userRow ?? null,
    items: itemRows.map((r) => ({
      id: r.id,
      productId: r.productId,
      product: {
        sku: r.sku,
        name: r.productName
      },
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      lineTotal: r.lineTotal
    }))
  };
}

export const salesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50), 200);
      const offset = Math.max(Number(req.query.offset ?? 0), 0);
      const status = req.query.status;

      const where =
        status === 'pending' || status === 'completed'
          ? eq(sales.status, status as SaleStatus)
          : undefined;

      const rows = await db
        .select()
        .from(sales)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(sales.id);

      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid id');
      const sale = await getSaleDetails(id);
      res.json({ data: sale });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createSaleSchema.parse(req.body);
      const status: SaleStatus = input.status ?? 'pending';

      if (status !== 'pending' && status !== 'completed') {
        throw new HttpError(400, 'Invalid status');
      }

      const createdId = await db.transaction(async (tx) => {
        const [userRow] = await tx.select().from(users).where(eq(users.id, input.userId)).limit(1);
        if (!userRow) throw new HttpError(404, 'User not found');

        const qtyByProduct = new Map<number, number>();
        for (const item of input.items) {
          qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.quantity);
        }
        const productIds = Array.from(qtyByProduct.keys());

        const productRows = await tx
          .select({ id: products.id, price: products.price, stock: products.stock })
          .from(products)
          .where(inArray(products.id, productIds));

        if (productRows.length !== productIds.length) {
          throw new HttpError(400, 'One or more products not found');
        }

        const productById = new Map(productRows.map((p) => [p.id, p]));

        let total = 0;
        const itemsToInsert: Array<{
          productId: number;
          quantity: number;
          unitPrice: number;
          lineTotal: number;
        }> = [];

        for (const [productId, quantity] of qtyByProduct.entries()) {
          const product = productById.get(productId);
          if (!product) throw new HttpError(400, 'One or more products not found');

          const unitPrice = product.price;
          const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
          total = Math.round((total + lineTotal) * 100) / 100;

          itemsToInsert.push({ productId, quantity, unitPrice, lineTotal });
        }

        const [saleRow] = await tx
          .insert(sales)
          .values({
            userId: input.userId,
            status,
            total
          })
          .returning();

        await tx.insert(saleItems).values(
          itemsToInsert.map((it) => ({
            saleId: saleRow.id,
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            lineTotal: it.lineTotal
          }))
        );

        if (status === 'completed') {
          for (const it of itemsToInsert) {
            const product = productById.get(it.productId);
            if (!product) throw new HttpError(400, 'One or more products not found');
            if (product.stock < it.quantity) {
              throw new HttpError(409, `Insufficient stock for product ${it.productId}`);
            }
          }

          for (const it of itemsToInsert) {
            const product = productById.get(it.productId)!;
            const newStock = product.stock - it.quantity;
            await tx.update(products).set({ stock: newStock }).where(eq(products.id, it.productId));
          }
        }

        return saleRow.id;
      });

      const sale = await getSaleDetails(createdId);
      res.status(201).json({ data: sale });
    } catch (err) {
      next(err);
    }
  },

  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid id');

      const updatedId = await db.transaction(async (tx) => {
        const [saleRow] = await tx.select().from(sales).where(eq(sales.id, id)).limit(1);
        if (!saleRow) throw new HttpError(404, 'Sale not found');

        if (saleRow.status === 'completed') throw new HttpError(409, 'Sale already completed');

        const itemRows = await tx
          .select({ productId: saleItems.productId, quantity: saleItems.quantity })
          .from(saleItems)
          .where(eq(saleItems.saleId, id));

        if (itemRows.length === 0) throw new HttpError(400, 'Sale has no items');

        const qtyByProduct = new Map<number, number>();
        for (const row of itemRows) {
          qtyByProduct.set(row.productId, (qtyByProduct.get(row.productId) ?? 0) + row.quantity);
        }

        const productIds = Array.from(qtyByProduct.keys());
        const productRows = await tx
          .select({ id: products.id, stock: products.stock })
          .from(products)
          .where(inArray(products.id, productIds));

        if (productRows.length !== productIds.length) {
          throw new HttpError(400, 'One or more products not found');
        }

        const productById = new Map(productRows.map((p) => [p.id, p]));

        for (const [productId, quantity] of qtyByProduct.entries()) {
          const product = productById.get(productId);
          if (!product) throw new HttpError(400, 'One or more products not found');
          if (product.stock < quantity) {
            throw new HttpError(409, `Insufficient stock for product ${productId}`);
          }
        }

        await tx.update(sales).set({ status: 'completed' }).where(eq(sales.id, id)).returning();

        for (const [productId, quantity] of qtyByProduct.entries()) {
          const product = productById.get(productId)!;
          const newStock = product.stock - quantity;
          await tx.update(products).set({ stock: newStock }).where(eq(products.id, productId));
        }

        return id;
      });

      const sale = await getSaleDetails(updatedId);
      res.json({ data: sale });
    } catch (err) {
      next(err);
    }
  }
};
