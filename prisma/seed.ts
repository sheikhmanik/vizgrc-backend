import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 1️⃣ Roles
  const roles = [
    { id: "role-admin", name: "Administrator" },
    { id: "role-risk-manager", name: "Risk Manager" },
    { id: "role-compliance-analyst", name: "Compliance Analyst" },
    { id: "role-auditor", name: "Auditor" },
    { id: "role-viewer", name: "Viewer" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  // 2️⃣ Permissions
  const modules = {
    risks: ["View", "Create", "Edit", "Delete"],
    assets: ["View", "Create", "Edit", "Delete"],
    controls: ["View", "Create", "Edit", "Delete"],
    frameworks: ["View", "Create", "Edit", "Delete"],
    compliance: ["View", "Assess", "Audit"],
    pipeline: ["View", "Create", "Edit", "Move"],
    audit: ["View", "Export"],
    settings: ["View", "Identity", "Schema"],
  };

  for (const [resource, actions] of Object.entries(modules)) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: {
          resource_action: { resource, action },
        },
        update: {},
        create: {
          resource,
          action,
        },
      });
    }
  }

  // 3️⃣ Default Admin User
  const hashedPassword = await bcrypt.hash("Admin@123", 10);

  await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      id: "U-1",
      name: "Admin Name",
      email: "admin@gmail.com",
      status: "Active",
      password: hashedPassword,
      roleId: "role-admin",
    },
  });

  console.log("Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });