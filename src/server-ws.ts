import WebSocket, { WebSocketServer } from "ws";
import type { Server } from "node:http";
import type { Server as WsServer } from "ws";
import type { Consumer } from "kafkajs";
import { createOrder } from "./functions/create-order";
import { createAddress } from "./functions/create-address";
import { createProduct } from "./functions/create-product";
import { db } from "./db";
import { eq } from "drizzle-orm";

interface Order {
  orderId: string;
  customerId: string;
  customerName: string;
  items: {
    name: string;
    price: number;
    description: string;
    imageUrl: string;
    quantity: number;
    productId: string;
  }[];
  amount: number;
  totalItems: number;
  createdAt: string;
  address: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipCode: string;
    neighborhood: string;
  };
}

export function createWebSocketServer(
  server: Server,
  consumer: Consumer
): WsServer {
  const wss = new WebSocketServer({ server });

  consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (message.value) {
        const orderParsed = JSON.parse(message.value.toString()) as Order;

        const { addressCreated } = await createAddress({
          city: orderParsed.address.city,
          neighborhood: orderParsed.address.neighborhood,
          number: orderParsed.address.number,
          street: orderParsed.address.street,
          state: orderParsed.address.state,
          zipCode: orderParsed.address.zipCode,
        });

        const { orderCreated } = await createOrder({
          address_id: addressCreated.id,
          customer: orderParsed.customerName,
          orderId: orderParsed.orderId,
          total: orderParsed.amount,
          createdAt: new Date(orderParsed.createdAt),
          status: "Novo Pedido",
        });

        const { products } = await createProduct(
          orderParsed.items.map((item) => {
            return {
              dishId: item.productId,
              imageUrl: item.imageUrl,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              orderId: orderCreated.id,
            };
          })
        );
        // biome-ignore lint/complexity/noForEach: <explanation>
        wss.clients.forEach(async (client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                order: {
                  id: orderCreated.id,
                  items: products.map((product) => ({
                    name: product.name,
                    quantity: product.quantity,
                  })),
                  status: orderCreated.status,
                  createdAt: orderCreated.createdAt,
                },
              })
            );
          }
        });
      }
    },
  });

  return wss;
}
