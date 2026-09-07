import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "../server/app.js";
import { prisma } from "../server/db.js";

describe("InboxIQ API", () => {
  it("returns exactly the four seed messages as raw Message objects", async () => {
    const response = await request(app).get("/api/messages");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(4);
    expect(response.body.map((message: { id: string }) => message.id)).toEqual([
      "message-perfect",
      "message-partial",
      "message-failure",
      "message-empty",
    ]);
    expect(response.body[0]).toEqual(expect.objectContaining({ company: "Acme", createdAt: expect.any(String) }));
    expect(response.body[0]).not.toHaveProperty("tags");
  });

  it("returns a raw message detail and no list alias", async () => {
    const detail = await request(app).get("/api/messages/message-perfect");
    const alias = await request(app).get("/api/messages/list");

    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe("message-perfect");
    expect(detail.body).not.toHaveProperty("message");
    expect(alias.status).toBe(404);
  });

  it("starts with no leads", async () => {
    const leads = await request(app).get("/api/leads");

    expect(leads.status).toBe(200);
    expect(leads.body).toEqual([]);
    expect(await prisma.lead.count()).toBe(0);
  });

  it("creates multiple NEW leads for the same source message", async () => {
    const payload = {
      sourceMessageId: "message-perfect",
      product: "  Desk  ",
      quantity: 30,
      material: "  Oak  ",
      budget: 50000,
    };

    const first = await request(app).post("/api/leads").send(payload);
    const second = await request(app).post("/api/leads").send(payload);

    expect(first.status).toBe(201);
    expect(first.body).toEqual(expect.objectContaining({
      id: expect.any(String),
      sourceMessageId: "message-perfect",
      product: "Desk",
      quantity: 30,
      material: "Oak",
      budget: 50000,
      status: "NEW",
      createdAt: expect.any(String),
    }));
    expect(second.status).toBe(201);
    expect(second.body.id).not.toBe(first.body.id);
    expect(await prisma.lead.count({ where: { sourceMessageId: "message-perfect" } })).toBe(2);
  });

  it("normalizes optional lead values", async () => {
    const response = await request(app).post("/api/leads").send({
      sourceMessageId: "message-partial",
      product: "Chair",
      quantity: 12,
      material: "   ",
    });

    expect(response.status).toBe(201);
    expect(response.body.material).toBeNull();
    expect(response.body.budget).toBeNull();
  });

  it.each([
    ["blank product", { sourceMessageId: "message-perfect", product: "   ", quantity: 1 }],
    ["zero quantity", { sourceMessageId: "message-perfect", product: "Desk", quantity: 0 }],
    ["negative quantity", { sourceMessageId: "message-perfect", product: "Desk", quantity: -1 }],
    ["fractional quantity", { sourceMessageId: "message-perfect", product: "Desk", quantity: 1.5 }],
    ["string quantity", { sourceMessageId: "message-perfect", product: "Desk", quantity: "1" }],
    ["negative budget", { sourceMessageId: "message-perfect", product: "Desk", quantity: 1, budget: -1 }],
    ["string budget", { sourceMessageId: "message-perfect", product: "Desk", quantity: 1, budget: "100" }],
    ["client status", { sourceMessageId: "message-perfect", product: "Desk", quantity: 1, status: "CONTACTED" }],
  ])("rejects invalid lead payload: %s", async (_name, payload) => {
    const countBefore = await prisma.lead.count();
    const response = await request(app).post("/api/leads").send(payload);

    expect(response.status).toBe(400);
    expect(await prisma.lead.count()).toBe(countBefore);
  });

  it("rejects an unknown source message without creating a lead", async () => {
    const countBefore = await prisma.lead.count();
    const response = await request(app).post("/api/leads").send({
      sourceMessageId: "missing-message",
      product: "Desk",
      quantity: 1,
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "message_not_found" });
    expect(await prisma.lead.count()).toBe(countBefore);
  });

  it("changes a NEW lead to CONTACTED and returns the raw persisted lead", async () => {
    const created = await request(app).post("/api/leads").send({
      sourceMessageId: "message-failure",
      product: "Meeting table",
      quantity: 1,
    });

    const response = await request(app)
      .patch(`/api/leads/${created.body.id}/status`)
      .send({ status: "CONTACTED" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      id: created.body.id,
      status: "CONTACTED",
      createdAt: expect.any(String),
    }));
    expect(response.body).not.toHaveProperty("lead");
    expect((await prisma.lead.findUnique({ where: { id: created.body.id } }))?.status).toBe("CONTACTED");
  });

  it.each([
    ["NEW", { status: "NEW" }],
    ["missing status", {}],
    ["string body", "CONTACTED"],
    ["extra field", { status: "CONTACTED", reason: "called" }],
  ])("rejects invalid status payload: %s", async (_name, payload) => {
    const created = await request(app).post("/api/leads").send({
      sourceMessageId: "message-empty",
      product: "Whiteboard",
      quantity: 6,
    });

    const response = await request(app).patch(`/api/leads/${created.body.id}/status`).send(payload);

    expect(response.status).toBe(400);
    expect((await prisma.lead.findUnique({ where: { id: created.body.id } }))?.status).toBe("NEW");
  });

  it("rejects an unknown lead status update", async () => {
    const response = await request(app)
      .patch("/api/leads/missing-lead/status")
      .send({ status: "CONTACTED" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "lead_not_found" });
  });

  it("rejects a repeated status transition without changing the persisted status", async () => {
    const created = await request(app).post("/api/leads").send({
      sourceMessageId: "message-partial",
      product: "Chair",
      quantity: 12,
    });
    await request(app).patch(`/api/leads/${created.body.id}/status`).send({ status: "CONTACTED" });

    const repeated = await request(app)
      .patch(`/api/leads/${created.body.id}/status`)
      .send({ status: "CONTACTED" });

    expect(repeated.status).toBe(409);
    expect(repeated.body).toEqual({ error: "invalid_status_transition" });
    expect((await prisma.lead.findUnique({ where: { id: created.body.id } }))?.status).toBe("CONTACTED");
  });

  it("returns a stable error for malformed API JSON", async () => {
    const response = await request(app)
      .post("/api/ai/extract")
      .set("content-type", "application/json")
      .send('{"messageId":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "invalid_json" });
  });

  it("accepts only the strict messageId extraction request", async () => {
    const alias = await request(app).post("/api/ai/extract").send({ id: "message-perfect" });
    const perfect = await request(app).post("/api/ai/extract").send({ messageId: "message-perfect" });

    expect(alias.status).toBe(400);
    expect(perfect.status).toBe(200);
    expect(perfect.body).toEqual({ product: "Desk", quantity: 30, material: "Oak", budget: 50000 });
  });

  it("returns deterministic partial, failure, and empty extraction states", async () => {
    const partial = await request(app).post("/api/ai/extract").send({ messageId: "message-partial" });
    const failure = await request(app).post("/api/ai/extract").send({ messageId: "message-failure" });
    const empty = await request(app).post("/api/ai/extract").send({ messageId: "message-empty" });

    expect(partial.status).toBe(200);
    expect(partial.body).toEqual({ product: "Ergonomic Chair", quantity: null, material: "Black", budget: 12000 });
    expect(failure.status).toBe(500);
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({});
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
