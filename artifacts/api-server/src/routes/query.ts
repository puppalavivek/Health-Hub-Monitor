import { Router } from "express";
import { db } from "@workspace/db";
import { documentChunksTable, documentsTable, queryHistoryTable } from "@workspace/db";
import { QueryDocumentsBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { eq, sql } from "drizzle-orm";

const router = Router();

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

function simpleKeywordScore(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const lowerText = text.toLowerCase();
  let score = 0;
  for (const word of queryWords) {
    const regex = new RegExp(word, "g");
    const matches = lowerText.match(regex);
    if (matches) score += matches.length;
  }
  return score;
}

router.post("/query", async (req, res) => {
  const parsed = QueryDocumentsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { question, topK = 5 } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const chunks = await db
      .select({
        id: documentChunksTable.id,
        documentId: documentChunksTable.documentId,
        content: documentChunksTable.content,
        chunkIndex: documentChunksTable.chunkIndex,
        docTitle: documentsTable.title,
        docSource: documentsTable.source,
      })
      .from(documentChunksTable)
      .innerJoin(documentsTable, eq(documentChunksTable.documentId, documentsTable.id));

    const scored = chunks.map((chunk) => ({
      ...chunk,
      score: simpleKeywordScore(question, chunk.content),
    }));

    const topChunks = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter((c) => c.score > 0 || scored.length <= topK);

    const contextChunks = topChunks.length > 0 ? topChunks : scored.slice(0, topK);
    const context = contextChunks
      .map((c, i) => `[Source ${i + 1}: ${c.docTitle}]\n${c.content}`)
      .join("\n\n---\n\n");

    const systemPrompt = `You are a knowledgeable assistant that answers questions based on provided document context. 
Always cite your sources using [Source N] notation when referencing information from the context.
If the answer is not in the context, say so clearly. Be concise and accurate.

Context:
${context}`;

    const sources = contextChunks.map((c, i) => ({
      index: i + 1,
      documentId: c.documentId,
      title: c.docTitle,
      source: c.docSource,
      chunkIndex: c.chunkIndex,
      preview: c.content.slice(0, 200) + (c.content.length > 200 ? "..." : ""),
    }));

    res.write(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`);

    let fullAnswer = "";
    const stream = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullAnswer += content;
        res.write(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`);
      }
    }

    await db.insert(queryHistoryTable).values({
      question,
      answer: fullAnswer,
      sourceCount: sources.length,
    });

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to query documents");
    res.write(`data: ${JSON.stringify({ type: "error", message: "Query failed" })}\n\n`);
    res.end();
  }
});

router.get("/queries/history", async (req, res) => {
  try {
    const history = await db
      .select()
      .from(queryHistoryTable)
      .orderBy(sql`${queryHistoryTable.createdAt} DESC`)
      .limit(50);

    res.json(
      history.map((q) => ({
        id: q.id,
        question: q.question,
        answer: q.answer,
        sourceCount: q.sourceCount,
        createdAt: q.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list query history");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
