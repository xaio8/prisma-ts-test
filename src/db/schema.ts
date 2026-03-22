import {
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar
} from 'drizzle-orm/pg-core';

import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  email: varchar('email', { length: 200 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  // Drizzle's default pg `numeric` maps to string; we cast to `number` for easier sample usage.
  price: numeric('price', { precision: 12, scale: 2 }).notNull().$type<number>(),
  stock: integer('stock').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export type SaleStatus = 'pending' | 'completed' | 'cancelled';

export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  total: numeric('total', { precision: 14, scale: 2 }).notNull().$type<number>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id')
    .notNull()
    .references(() => sales.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull().$type<number>(),
  lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull().$type<number>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const usersRelations = relations(users, ({ many }) => ({
  sales: many(sales)
}));

export const productsRelations = relations(products, ({ many }) => ({
  saleItems: many(saleItems)
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  user: one(users, {
    fields: [sales.userId],
    references: [users.id]
  }),
  items: many(saleItems)
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id]
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id]
  })
}));

