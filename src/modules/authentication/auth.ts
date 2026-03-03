import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";

export default function authentication(fastify: FastifyInstance) {
  fastify.post("/login", async (req, reply) => {
    const { email, password } = req.body as any;
    try {

      let users = await fastify.prisma.user.findMany();

      let user = await fastify.prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        if (user.password === null) return reply.status(400).send({ error: "Invalid credentials." });
        const isPasswordValid = bcrypt.compareSync(password, user.password);
        if (!isPasswordValid) return reply.status(401).send({ error: "Invalid password" });
      } else {
        return reply.status(404).send({ error: "User not found" });
      }

      const token = fastify.jwt.sign({ id: user?.id }, { expiresIn: "24h" });
      reply.send({ token });
    } catch (error) {
      console.error("Error during login:", error);
      reply.status(500).send({ error: "Login failed" });
    }
  });
}