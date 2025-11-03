import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import connectDB from "./config/db.js";
import personRoutes from "./routes/Person.js";
import { errorHandler, notFound } from "./middleware/errMiddleware.js";

dotenv.config();
const PORT = process.env.PORT || 5000;

connectDB();

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
// app.use(cors());
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173/",
  "https://familytree-frontend.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(morgan("dev"));

app.get("/", (req, res) => res.send("MERN Family Tree Backend"));

app.use("/api/persons", personRoutes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
