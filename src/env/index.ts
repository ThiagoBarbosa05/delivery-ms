import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  KAFKA_CLIENT_ID: z.string(),
  KAFKA_BROKER: z.string(),
  KAFKA_CONSUMER_GROUP_ID: z.string(),
  JWT_PUBLIC_KEY: z.string(),
});

export const env = envSchema.parse(process.env);
