import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  orders as orderTable,
  products as productTable,
  addresses as addressTable,
} from "../db/schema";

type Order = {
  address_id: string;
  customer: string;
  orderId: string;
  total: number;
  createdAt: Date;
  status: string;
};

type Address = {
  city: string;
  neighborhood: string;
  number: string;
  street: string;
  state: string;
  zipCode: string;
};

type Product = {
  dishId: string;
  imageUrl: string;
  name: string;
  price: number;
  quantity: number;
  orderId: string;
};

export async function createOrder(order: Order) {
  const [orderCreated] = await db
    .insert(orderTable)
    .values({
      address_id: order.address_id,
      customer: order.customer,
      orderId: order.orderId,
      total: order.total,
      createdAt: new Date(order.createdAt),
      status: order.status,
    })
    .returning();

  return { orderCreated };

  // const [addressCreated] = await db
  //   .insert(addressTable)
  //   .values({
  //     city: address.city,
  //     neighborhood: address.neighborhood,
  //     number: address.number,
  //     street: address.street,
  //     state: address.state,
  //     zipCode: address.zipCode,
  //   })
  //   .returning();

  // const [productCreated] = await db
  //   .insert(productTable)
  //   .values(product)
  //   .returning();
}
