import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/db.js";
import { clerkMiddleware } from "@clerk/express";
import clerkWebhooks from "./controllers/clerkWebhooks.js";

connectDB();

const app = express();
const PORT = process.env.PORT_SERVER || 3000;

// MIDDLEWARE
app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

// API to listen to Clerk Webhooks
app.use("/api/clerk", clerkWebhooks);

// Routes
app.get("/", (req, res) => res.send("Server is Live and fine"));

//START THE SERVER
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
