import { FastifyInstance } from "fastify";
import authMiddleware from "../../middleware/authMiddleware";
import { sendEmail } from "../utils/mailer";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export default function Settings(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authMiddleware);

  fastify.post("/send-invitation", async (req, reply) => {
    const {
      id,
      name,
      email,
      role,
      status,
    } = req.body as any;

    const user = await fastify.prisma.user.findUnique({ where: { email }});
    
    if (user) {
      return reply.status(400).send({ error: "User with this email already exists" });
    };

    const roleRecord = await fastify.prisma.role.findUnique({ where: { name: role }});
    
    if (!roleRecord) {
      return reply.status(400).send({ error: "Role not found" });
    }

    const inviteToken = crypto.randomBytes(32).toString("hex");

    try {
      await fastify.prisma.user.create({
        data: {
          id,
          name,
          email,
          status,
          roleId: roleRecord.id,
          inviteToken,
          inviteExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }
      });
      
      const inviteLink = `${process.env.APP_URL}/accept-invite?token=${inviteToken}`;
      await sendEmail(email, name, inviteLink);

      reply.send({ message: "Invitation sent successfully" });
    } catch (error) {
      console.error("Error sending invitation:", error);
      reply.status(500).send({ error: "Failed to send invitation" });
    }
  });

  fastify.post("/accept-invite", async (req, reply) => {
    const { token, password } = req.body as { token: string, password: string };
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await fastify.prisma.user.findFirst({
      where: {
        inviteToken: token,
        inviteExpires: {
          gt: new Date()
        },
        password: null
      }
    });

    if (!user) {
      return reply.status(400).send({ error: "Invalid or expired token" });
    }

    await fastify.prisma.user.update({
      where: { id: user.id },
      data: {
        status: "Active",
        inviteToken: null,
        inviteExpires: null,
        password: hashedPassword,
      }
    });

    return reply.send({ message: "Account activated successfully" });
  });

  fastify.delete("/delete-user/:id", async (req, reply) => {
    const { id } = req.params as any;

    try {
      await fastify.prisma.user.delete({ where: { id } });
      reply.send({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      reply.status(500).send({ error: "Failed to delete user" });
    }
  });

  fastify.put("/update-user-role/:id", async (req, reply) => {
    const { id } = req.params as any;
    const { role } = req.body as any;

    try {
      await fastify.prisma.user.update({
        where: { id },
        data: { role },
      });
      reply.send({ message: "User role updated successfully" });
    } catch (error) {
      console.error("Error updating user role:", error);
      reply.status(500).send({ error: "Failed to update user role" });
    }
  });

  fastify.get("/get-users", async (req, reply) => {
    try {
      const users = await fastify.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
        },
      });
      reply.send(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      reply.status(500).send({ error: "Failed to fetch users" });
    }
  });

  fastify.get("/get-user", async (req, reply) => {
    try {
      const user = await fastify.prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
        },
      });
      reply.send(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      reply.status(500).send({ error: "Failed to fetch user" });
    }
  });

  fastify.post("/toggle-permission", async (req, reply) => {
    const { roleName, permId } = req.body as {
      roleName: string;
      permId: string;
    };
  
    const [resource, action] = permId.split("-");

    if (!resource || !action) {
      return reply.status(400).send({ error: "Invalid permission ID format" });
    };
  
    const role = await fastify.prisma.role.findUnique({
      where: { name: roleName }
    });
  
    if (!role) {
      return reply.status(404).send({ error: "Role not found" });
    }
  
    const permission = await fastify.prisma.permission.findUnique({
      where: {
        resource_action: {
          resource: resource,
          action: action
        }
      }
    });
  
    if (!permission) {
      return reply.status(404).send({ error: "Permission not found" });
    }
  
    const existing = await fastify.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id
        }
      }
    });
  
    if (existing) {
      await fastify.prisma.rolePermission.delete({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        }
      });
  
      return reply.send({ message: "Permission revoked" });
    } else {
      await fastify.prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
  
      return reply.send({ message: "Permission granted" });
    }
  });

  fastify.get("/get-role-permissions", async (req, reply) => {
    const roles = await fastify.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });
  
    const formatted: Record<string, string[]> = {};
  
    roles.forEach((role: any) => {
      formatted[role.name] = role.permissions.map((rp: any) =>
        `${rp.permission.resource}-${rp.permission.action}`
      );
    });
  
    return reply.send(formatted);
  });
}