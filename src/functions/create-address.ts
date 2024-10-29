import { db } from "../db";
import { addresses as addressTable } from "../db/schema";

type Address = {
  city: string;
  neighborhood: string;
  number: string;
  street: string;
  state: string;
  zipCode: string;
};
export async function createAddress(address: Address) {
  const [addressCreated] = await db
    .insert(addressTable)
    .values({
      city: address.city,
      neighborhood: address.neighborhood,
      number: address.number,
      street: address.street,
      state: address.state,
      zipCode: address.zipCode,
    })
    .returning();

  return { addressCreated };
}
