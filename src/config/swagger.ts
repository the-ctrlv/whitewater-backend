import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "WhiteWater API",
      version: "1.0.0",
      description: "Auth API for WhiteWater",
    },
    servers: [
      { url: "http://localhost:3000", description: "Local" },
      {
        url: "https://whitewater-backend.onrender.com",
        description: "Production",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
});
