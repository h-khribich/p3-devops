import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding de la base de données e2e...");

  const email = "e2e-seed@test.com";
  const password = "SeedPass123!";

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    console.log(`   ↳ L'utilisateur ${email} existe déjà, mise à jour du mot de passe.`);
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });
  } else {
    console.log(`   ↳ Création de l'utilisateur ${email}.`);
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });
  }

  console.log("✅ Seed terminé.");
}

main()
  .catch((error) => {
    console.error("❌ Erreur lors du seed :", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
