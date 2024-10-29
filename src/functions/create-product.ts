import { db } from "../db";
import { products as productTable } from "../db/schema";

type Product = {
  dishId: string;
  imageUrl: string;
  name: string;
  price: number;
  quantity: number;
  orderId: string;
};

export async function createProduct(product: Product[]) {
  const products = await db.insert(productTable).values(product).returning();

  return { products };
}

// export async function getNewOrder(newOrderId: string) {
//   return await db
//     .select()
//     .from(order)
//     .leftJoin(product, eq(order.id, product.orderId));
// }
