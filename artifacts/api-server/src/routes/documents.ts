import { Router } from "express";
import { db } from "@workspace/db";
import { documentsTable, documentChunksTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import {
  IngestDocumentBody,
  GetDocumentParams,
  DeleteDocumentParams,
} from "@workspace/api-zod";

const router = Router();

function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start >= text.length) break;
  }
  return chunks;
}

router.get("/documents", async (req, res) => {
  try {
    const docs = await db
      .select({
        id: documentsTable.id,
        title: documentsTable.title,
        source: documentsTable.source,
        type: documentsTable.type,
        createdAt: documentsTable.createdAt,
        chunkCount: count(documentChunksTable.id),
      })
      .from(documentsTable)
      .leftJoin(documentChunksTable, eq(documentChunksTable.documentId, documentsTable.id))
      .groupBy(documentsTable.id)
      .orderBy(sql`${documentsTable.createdAt} DESC`);

    res.json(
      docs.map((d) => ({
        id: d.id,
        title: d.title,
        source: d.source,
        type: d.type,
        chunkCount: d.chunkCount,
        createdAt: d.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list documents");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/documents/stats", async (req, res) => {
  try {
    const [docsResult] = await db
      .select({ total: count() })
      .from(documentsTable);
    const [chunksResult] = await db
      .select({ total: count() })
      .from(documentChunksTable);

    const byType = await db
      .select({ type: documentsTable.type, cnt: count() })
      .from(documentsTable)
      .groupBy(documentsTable.type);

    const { queryHistoryTable } = await import("@workspace/db");
    const [queriesResult] = await db
      .select({ total: count() })
      .from(queryHistoryTable);

    const documentsByType: Record<string, number> = {};
    for (const row of byType) {
      documentsByType[row.type] = row.cnt;
    }

    res.json({
      totalDocuments: docsResult.total,
      totalChunks: chunksResult.total,
      totalQueries: queriesResult.total,
      documentsByType,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/documents", async (req, res) => {
  const parsed = IngestDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { title, source, type, content } = parsed.data;

  try {
    const [doc] = await db
      .insert(documentsTable)
      .values({ title, source, type, content })
      .returning();

    const chunks = chunkText(content, 600, 80);
    if (chunks.length > 0) {
      await db.insert(documentChunksTable).values(
        chunks.map((c, i) => ({
          documentId: doc.id,
          content: c,
          chunkIndex: i,
        }))
      );
    }

    res.status(201).json({
      id: doc.id,
      title: doc.title,
      source: doc.source,
      type: doc.type,
      chunkCount: chunks.length,
      createdAt: doc.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to ingest document");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/documents/:id", async (req, res) => {
  const parsed = GetDocumentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const [doc] = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, parsed.data.id));

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const chunks = await db
      .select()
      .from(documentChunksTable)
      .where(eq(documentChunksTable.documentId, doc.id))
      .orderBy(documentChunksTable.chunkIndex);

    res.json({
      id: doc.id,
      title: doc.title,
      source: doc.source,
      type: doc.type,
      chunkCount: chunks.length,
      createdAt: doc.createdAt.toISOString(),
      chunks: chunks.map((c) => ({
        id: c.id,
        documentId: c.documentId,
        content: c.content,
        chunkIndex: c.chunkIndex,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get document");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/documents/:id", async (req, res) => {
  const parsed = DeleteDocumentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const [doc] = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, parsed.data.id));

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    await db.delete(documentsTable).where(eq(documentsTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete document");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
