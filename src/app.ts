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

app.get("/products", async (req, res) => {
  try {
    const { category } = req.query;

    const query: Record<string, unknown> = {};

    if (category && typeof category === "string") {
      query.category = category;
    }

    const products = await productsCollection.find(query).toArray();

    res.send({
      success: true,
      data: products,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch products",
    });
  }
});

app.get("/categories", async (req, res) => {
  try {
    const categories = await productsCollection.distinct("category");
    res.send({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Faild to fetch categories",
    });
  }
});

export default app;
