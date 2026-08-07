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

//Popular categories with sample images
app.get("/api/categories/popular", async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          imageUrl: { $first: { $arrayElemAt: ["$imageUrls", 0] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ];

    const result = await productsCollection.aggregate(pipeline).toArray();

    const categories = result.map((item) => ({
      category: item._id,
      imageUrl: item.imageUrl || null,
      productCount: item.count,
    }));

    res.send({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching popular categories:", error);
    res.status(500).send({
      success: false,
      message: "Failed to fetch popular categories",
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
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const status = typeof req.query.status === "string" ? req.query.status : "";

    const pageParam = typeof req.query.page === "string" ? req.query.page : "1";

    const limitParam =
      typeof req.query.limit === "string" ? req.query.limit : "10";

    const page = Math.max(Number.parseInt(pageParam, 10) || 1, 1);
    const limit = Math.min(
      Math.max(Number.parseInt(limitParam, 10) || 10, 1),
      100,
    );

    const skip = (page - 1) * limit;

    // Filter
    const filter: {
      status?: string;
      $or?: Array<Record<string, RegExp>>;
    } = {};

    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    // Search filter
    if (search) {
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );

      filter.$or = [
        { "customer.fullName": searchRegex },
        { "customer.phone": searchRegex },
        { "customer.streetAddress": searchRegex },
        { "product.name": searchRegex },
      ];
    }

    // Total count
    const total = await ordersCollection.countDocuments(filter);

    const totalPages = Math.max(Math.ceil(total / limit), 1);

    // Orders
    const result = await ordersCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return res.status(200).json({
      success: true,
      data: result,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);

    return res.status(500).json({
      success: false,
      data: [],
      message: "Failed to fetch orders",
      pagination: {
        total: 0,
        totalPages: 1,
        currentPage: 1,
        limit: 10,
      },
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
