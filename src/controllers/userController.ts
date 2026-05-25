import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { HttpError } from '../middleware/errorHandler';
import { parsePagination, parseId } from '../utils/params';

const createUserSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200)
});

const updateUserSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().max(200).optional()
  })
  .refine((v) => v.name !== undefined || v.email !== undefined, {
    message: 'At least one field must be provided'
  });

export const userController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = parsePagination(req);
      const rows = await db.select().from(users).limit(limit).offset(offset).orderBy(users.id);
      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseId(req);
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!user) throw new HttpError(404, 'User not found');
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createUserSchema.parse(req.body);

      const [created] = await db
        .insert(users)
        .values({
          name: input.name,
          email: input.email
        })
        .returning();

      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseId(req);
      const input = updateUserSchema.parse(req.body);

      const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!existing) throw new HttpError(404, 'User not found');

      const updatePayload: Partial<typeof users.$inferInsert> = {};
      if (input.name !== undefined) updatePayload.name = input.name;
      if (input.email !== undefined) updatePayload.email = input.email;

      const [updated] = await db
        .update(users)
        .set(updatePayload)
        .where(eq(users.id, id))
        .returning();
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseId(req);
      const rows = await db.delete(users).where(eq(users.id, id)).returning();
      if (rows.length === 0) throw new HttpError(404, 'User not found');
      res.json({ data: { deleted: true, id } });
    } catch (err) {
      next(err);
    }
  }
};
