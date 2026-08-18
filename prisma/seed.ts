import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.lead.deleteMany();
  await prisma.message.deleteMany();

  await prisma.message.createMany({
    data: [
      {
        id: "message-perfect",
        senderName: "Anna Kowalska",
        senderEmail: "anna@acme.example",
        company: "Acme",
        subject: "30 oak desks for our new office",
        body: "Hi, I'm Anna from Acme. We need 30 desks made from oak for our new office. Our budget is 50,000 PLN. Can you send us a quote and lead time?",
        createdAt: new Date("2026-08-15T08:30:00.000Z"),
      },
      {
        id: "message-partial",
        senderName: "Oskar Nowak",
        senderEmail: "oskar@studioforma.example",
        company: "Studio Forma",
        subject: "Black ergonomic chairs",
        body: "Hello, we are looking for ergonomic chairs in black for our team. We have a budget of around 12,000 PLN. Could you share available options and delivery details?",
        createdAt: new Date("2026-08-14T14:10:00.000Z"),
      },
      {
        id: "message-failure",
        senderName: "Julia Wójcik",
        senderEmail: "julia@orbit.example",
        company: "Orbit Retail",
        subject: "Quote request for a meeting table",
        body: "Hello, we are interested in a quote for a custom meeting table for our new office. Please let us know what information you need from us.",
        createdAt: new Date("2026-08-13T11:45:00.000Z"),
      },
      {
        id: "message-empty",
        senderName: "Michał Zieliński",
        senderEmail: "michal@unknown.example",
        company: "Unknown",
        subject: "A quick question",
        body: "Hi, could you tell me a little more about what you offer and how your ordering process works?",
        createdAt: new Date("2026-08-12T09:00:00.000Z"),
      },
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
