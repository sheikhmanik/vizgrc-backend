import { FastifyInstance } from "fastify";
import authMiddleware from "../../middleware/authMiddleware";

export default function assetRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authMiddleware);

  fastify.post("/create-asset", async (req, reply) => {
    const { id, name, type, category, classification, criticality } = req.body as any;
    try {
      await fastify.prisma.asset.create({
        data: {
          id,
          name,
          type,
          category,
          classification,
          criticality,
          userId: req.userId
        }
      })
      console.log("Asset created successfully.");
    } catch (error: any) {
      console.log(process.env.DATABASE_URL);
      console.error(error);
      return reply.status(500).send({ error: error.message });
    }
  });

  fastify.get("/get-assets", async (req, reply) => {
    try {
      const assets = await fastify.prisma.asset.findMany({
        where: { userId: req.userId }
      });
      reply.send(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      reply.status(500).send({ error: "Failed to fetch assets" });
    }
  });
}