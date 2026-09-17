import "dotenv/config";
import { prisma } from "../lib/db/prisma";

async function run() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      freeReviewUsed: true,
      contracts: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          versions: {
            select: {
              id: true,
              reviews: {
                select: {
                  id: true,
                  status: true,
                  isFreeTrial: true,
                  isPaid: true,
                },
              },
            },
          },
        },
      },
    },
  });

  console.log("DATABASE USERS & CONTRACTS:\n", JSON.stringify(users, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
