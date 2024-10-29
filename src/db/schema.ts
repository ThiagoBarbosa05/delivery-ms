import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// export const OrderStatus = pgEnum("status", [
//   "NOVO PEDIDO",
//   "EM ANDAMENTO",
//   "CONCLUÍDO",
//   "CANCELADO",
//   "SAIU PARA ENTREGA",
//   "RETORNADO",
// ]);

export const products = pgTable("products", {
  id: text("id")
    .primaryKey()
    .$default(() => createId()),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  quantity: integer("quantity").notNull(),
  imageUrl: text("image_url").notNull(),
  dishId: text("dish_id").notNull(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
});

export const orders = pgTable("orders", {
  id: text("id")
    .primaryKey()
    .$default(() => createId()),
  orderId: text("order_id").notNull(),
  address_id: text("address_id")
    .notNull()
    .references(() => addresses.id, { onDelete: "cascade" }),
  customer: text("customer").notNull(),
  total: integer("total").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at"),
  confirmAt: timestamp("confirm_at"),
  completedAt: timestamp("completed_at"),
  canceledAt: timestamp("canceled_at"),
  deliveringAt: timestamp("delivering_at"),
  returnedAt: timestamp("returned_at"),
});

export const addresses = pgTable("addresses", {
  id: text("id")
    .primaryKey()
    .$default(() => createId()),

  street: text("street").notNull(),
  number: text("number").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  neighborhood: text("neighborhood").notNull(),
});

export const ordersRelations = relations(orders, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  order: one(orders, {
    fields: [products.orderId],
    references: [orders.id],
  }),
}));
