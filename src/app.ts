import express from "express";
import cors from "cors";
import { productsCollection } from "./config/db";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server Running...");
});

app.post("/add-product", async (req, res) => {
  const paylod = {
    ...req.body,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await productsCollection.insertOne(paylod);
  res.send({
    success: true,
    data: {
      ...paylod,
      _id: result.insertedId,
    },
  });
});

export default app;
