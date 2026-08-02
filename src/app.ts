import express from "express";
import cors from "cors";
import { ordersCollection, productsCollection } from "./config/db";
import { ObjectId } from "mongodb";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://raha-surgical-client-ivory.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server Running...");
});
//add product
app.post("/add-product", async (req, res) => {
  const paylod = {
    ...req.body,
    featured: false,
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
//get all products
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
//get product by id
app.get("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productsCollection.findOne({ _id: new ObjectId(id) });
    if (!product) {
      return res.status(404).send({
        succsess: false,
        message: "Product not found",
      });
    }
    res.send({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch products",
    });
  }
});
//get all categories
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
//get featured products
app.get("/featured-products", async (req, res) => {
  try {
    const products = await productsCollection
      .find({ featured: false })
      .limit(8)
      .toArray();

    res.send({
      success: true,
      data: products,
    });
  } catch {
    res.status(500).send({
      success: false,
      message: "Failed to fetch featured products",
    });
  }
});

//order product
app.post("/order-product", async (req, res) => {
  try {
    const paylod = {
      ...req.body,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const orderedProduct = await ordersCollection.insertOne(paylod);
    res.send({
      success: true,
      data: {
        ...paylod,
        _id: orderedProduct.insertedId,
      },
    });
    // Implementation for ordering product
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to order product",
    });
  }
});

export default app;
