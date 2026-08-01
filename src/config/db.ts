import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI!);

export const db = client.db("raha-surgical-db");
export const productsCollection = db.collection("products");
export const ordersCollection = db.collection("orders");

export async function connectDB() {
  await client.connect();
  console.log("MongoDB Connected");
}

export default client;
