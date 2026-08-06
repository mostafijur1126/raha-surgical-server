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

//Update Product
app.patch("/update-product/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const result = await productsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData },
    );
    res.send({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to edit products",
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

//add order product
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

//get all ordered products
app.get("/ordered-product", async (req, res) => {
  try {
    const { search = "", status = "", page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    //filter object
    const filter: any = {};
    //status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    //Search filter (search in order ID, customer name, facility, etc.)
    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { "customer.fullName": searchRegex },
        { "customer.phone": searchRegex },
        { "customer.streetAddress": searchRegex },
        { "product.name": searchRegex },
      ];
    }
    // Get total count for pagination
    const total = await ordersCollection.countDocuments(filter);
    const totalPage = Math.ceil(total / limitNum);

    // Fetch orders with pagination and sorting (latest first)

    const result = await ordersCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();
    res.send({
      success: true,
      data: result,
      pagination: {
        total,
        totalPages: totalPage,
        currentPage: parseInt(page),
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send({
      success: false,
      message: "Faild to fetch orderds",
    });
  }
});

// PATCH - Update order status
app.patch("/ordered-product/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).send({
        success: false,
        message: "Status is required",
      });
    }

    const validStatuses = ["pending", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).send({
        success: false,
        message:
          "Invalid status. Allowed: pending, shipped, delivered, cancelled",
      });
    }

    const result = await ordersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

    if (!result) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    res.send({
      success: true,
      data: result,
      message: "Order status updated successfully",
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).send({
      success: false,
      message: "Failed to update order status",
    });
  }
});
export default app;
