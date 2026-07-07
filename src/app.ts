import "dotenv/config";
import express from "express";
import authRoutes from "./routes/auth.routes";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler.middleware";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Backend is running", status: "ok" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(errorHandler);

export default app;
