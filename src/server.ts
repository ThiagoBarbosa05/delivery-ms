import express from "express";
import { Kafka } from "kafkajs";
import { createWebSocketServer } from "./server-ws";
import { env } from "./env";
import { db } from "./db";
import { orders } from "./db/schema";
import { and, count, eq, gte, ilike, lte, sql, sum } from "drizzle-orm";
import { z } from "zod";
import dayjs from "dayjs";
import { authMiddleware } from "./middlewares/auth";

const app = express();

app.use(express.json());

const kafka = new Kafka({
  clientId: env.KAFKA_CLIENT_ID,
  brokers: [env.KAFKA_BROKER],
});

const consumer = kafka.consumer({ groupId: "delivery-consumer" });
consumer.connect();
consumer.subscribe({ topic: "orders", fromBeginning: true });

const querySchema = z.object({
  filter: z.string().optional(),
  page: z.coerce.number().default(0),
  size: z.coerce.number().default(2),
});
app.get("/api/orders", async (req, res) => {
  const { filter, page, size } = querySchema.parse(req.query);
  console.log(filter, page, size);

  const order = await db.query.orders.findMany({
    with: {
      products: true,
    },
    columns: {
      status: true,
      id: true,
      createdAt: true,
    },
    where: (table) =>
      filter ? ilike(table.status, filter as string) : undefined,
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    limit: size,
    offset: page * size,
  });

  const total = await db.select({ count: count() }).from(orders);

  return res.send({
    orders: order,
    totalItems: total[0].count,
    page,
    pageSize: size,
    totalPages: Math.ceil(total[0].count / 2),
  });
});

app.put("/api/orders/confirm/:id", authMiddleware, async (req, res) => {
  const orderId = req.params.id;

  const [orderUpdated] = await db
    .update(orders)
    .set({ confirmAt: new Date(), status: "preparando!" })
    .where(eq(orders.id, orderId))
    .returning();

  res.send(orderUpdated);
});

app.put("/api/orders/delivered/:id", authMiddleware, async (req, res) => {
  const orderId = req.params.id;

  const [orderUpdated] = await db
    .update(orders)
    .set({ completedAt: new Date(), status: "entregue" })
    .where(eq(orders.id, orderId))
    .returning();

  res.send(orderUpdated);
});

app.put("/api/orders/cancelled/:id", authMiddleware, async (req, res) => {
  const orderId = req.params.id;

  const [orderUpdated] = await db
    .update(orders)
    .set({ canceledAt: new Date(), status: "cancelado" })
    .where(eq(orders.id, orderId))
    .returning();

  res.send(orderUpdated);
});

app.put("/api/orders/dispatch/:id", authMiddleware, async (req, res) => {
  const orderId = req.params.id;

  const [orderUpdated] = await db
    .update(orders)
    .set({ deliveringAt: new Date(), status: "em rota de entrega" })
    .where(eq(orders.id, orderId))
    .returning();

  res.send(orderUpdated);
});

app.put("/api/orders/return/:id", authMiddleware, async (req, res) => {
  const orderId = req.params.id;

  const [orderUpdated] = await db
    .update(orders)
    .set({ returnedAt: new Date(), status: "devolvido" })
    .where(eq(orders.id, orderId))
    .returning();

  res.send(orderUpdated);
});

app.get("/api/metrics/month-cancelled-orders", async (req, res) => {
  const today = dayjs();
  const lastMonth = today.subtract(1, "month");

  const ordersPerMonth = await db
    .select({
      monthWithYear: sql<string>`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`,
      amount: count(orders.id),
      totalValue: sql`sum(${orders.total})`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, "cancelado"),
        and(
          gte(orders.canceledAt, lastMonth.toDate()),
          lte(orders.canceledAt, today.toDate())
        )
      )
    )
    .groupBy(sql`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`)
    .having(({ amount }) => gte(amount, 1));

  res.send(ordersPerMonth);
});

app.get("/api/metrics/day-orders", async (req, res) => {
  const today = dayjs();
  const yesterday = today.subtract(1, "day");

  const ordersPerDay = await db
    .select({
      monthWithYear: sql<string>`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`,
      amount: count(orders.id),
      totalValue: sql`sum(${orders.total})`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, yesterday.toDate()),
        lte(orders.createdAt, today.toDate())
      )
    )
    .groupBy(sql`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`)
    .having(({ amount }) => gte(amount, 1));

  res.send(ordersPerDay);
});

app.get("/api/metrics/month-orders", async (req, res) => {
  const today = dayjs();
  const lastMonth = today.subtract(1, "month");

  const ordersPerMonth = await db
    .select({
      monthWithYear: sql<string>`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`,
      amount: count(orders.id),
      totalValue: sql`sum(${orders.total})`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, lastMonth.toDate()),
        lte(orders.createdAt, today.toDate())
      )
    )
    .groupBy(sql`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`)
    .having(({ amount }) => gte(amount, 1));

  res.send(ordersPerMonth);
});

app.get("/api/metrics/receipts-orders", async (req, res) => {
  const today = dayjs();
  const lastMonth = today.subtract(1, "month");

  const ordersPerMonth = await db
    .select({
      monthWithYear: sql<string>`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`,
      receipt: sum(orders.total).mapWith(Number),
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, "entregue"),
        and(
          gte(orders.createdAt, lastMonth.toDate()),
          lte(orders.createdAt, today.toDate())
        )
      )
    )
    .groupBy(sql`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`)
    .having(({ receipt }) => gte(receipt, 1));

  res.send(ordersPerMonth);
});

const server = app.listen(3002, () => {
  console.log("Microservice listening on port 3002!");
});

createWebSocketServer(server, consumer);
