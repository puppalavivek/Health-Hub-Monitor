import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const queryHistoryTable = pgTable("query_history", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer"),
  sourceCount: integer("source_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQueryHistorySchema = createInsertSchema(queryHistoryTable).omit({ id: true, createdAt: true });
export type InsertQueryHistory = z.infer<typeof insertQueryHistorySchema>;
export type QueryHistory = typeof queryHistoryTable.$inferSelect;
