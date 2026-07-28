import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI!);

export const db = client.db("raha-surgical-db");
export const productsCollection = db.collection("products");

export async function connectDB() {
  await client.connect();
  console.log("MongoDB Connected");
}

export default client;
