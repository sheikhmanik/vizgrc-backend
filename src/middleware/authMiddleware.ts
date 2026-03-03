import { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

export default async function authMiddleware( request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify<{ id: string }>();
    request.userId = decoded.id;
  } catch (err) {
    return reply.status(401).send({
      message: "Unauthorized. Invalid or missing token.",
    });
  }
}