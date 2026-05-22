import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Search, Cpu, FileText, Layers, AlertTriangle } from "lucide-react";

export default function Architecture() {
  return (
    <div className="space-y-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">System Architecture</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A production-grade Retrieval-Augmented Generation pipeline built for high-precision knowledge retrieval.
        </p>
      </div>

      {/* Pipeline Diagram */}
      <div className="relative py-8">
        <div className="absolute inset-0 bg-primary/5 rounded-3xl -z-10" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-6 relative">
          
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20 -translate-y-1/2 z-0" />

          {/* Stage 1 */}
          <div className="bg-card border-2 border-primary/20 rounded-xl p-6 relative z-10 shadow-lg shadow-primary/5">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">Ingestion</h3>
            <p className="text-sm text-muted-foreground">Raw documents (PDF, Word, Confluence) are parsed and normalized into plain text.</p>
          </div>

          {/* Stage 2 */}
          <div className="bg-card border-2 border-blue-500/20 rounded-xl p-6 relative z-10 shadow-lg shadow-blue-500/5">
            <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
              <Layers className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="font-bold text-lg mb-2">Chunking</h3>
            <p className="text-sm text-muted-foreground">Text is split using recursive character chunking to preserve semantic boundaries.</p>
          </div>

          {/* Stage 3 */}
          <div className="bg-card border-2 border-purple-500/20 rounded-xl p-6 relative z-10 shadow-lg shadow-purple-500/5">
            <div className="h-12 w-12 bg-purple-500/10 rounded-full flex items-center justify-center mb-4 border border-purple-500/20">
              <Database className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="font-bold text-lg mb-2">Vector Store</h3>
            <p className="text-sm text-muted-foreground">Chunks are embedded and stored in pgvector using HNSW indexes for fast retrieval.</p>
          </div>

          {/* Stage 4 */}
          <div className="bg-card border-2 border-indigo-500/20 rounded-xl p-6 relative z-10 shadow-lg shadow-indigo-500/5">
            <div className="h-12 w-12 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 border border-indigo-500/20">
              <Cpu className="h-6 w-6 text-indigo-500" />
            </div>
            <h3 className="font-bold text-lg mb-2">Generation</h3>
            <p className="text-sm text-muted-foreground">LLM synthesizes an answer using only the retrieved context chunks.</p>
          </div>

        </div>
      </div>

      {/* Details */}
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              1. Chunking Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/80 space-y-2">
            <p><strong>Method:</strong> Recursive character chunking</p>
            <p><strong>Parameters:</strong> 600 characters with 80-character overlap</p>
            <p><strong>Rationale:</strong> This specific size preserves sentence boundaries and semantic coherence for dense technical documents while fitting perfectly into the embedding model's context window. The overlap ensures context isn't lost at chunk boundaries.</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              2. Embedding Model
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/80 space-y-2">
            <p><strong>Model:</strong> text-embedding-3-large</p>
            <p><strong>Dimensionality:</strong> 3072 dimensions</p>
            <p><strong>Rationale:</strong> Chosen for its superior semantic recall on mixed technical documentation. It outperforms smaller models significantly when queries use vocabulary that differs slightly from the source text.</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              3. Vector Store
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/80 space-y-2">
            <p><strong>Engine:</strong> pgvector (PostgreSQL extension)</p>
            <p><strong>Index:</strong> HNSW (Hierarchical Navigable Small World)</p>
            <p><strong>Rationale:</strong> Co-locating vector data with application relational data simplifies architecture. HNSW provides sub-10ms approximate nearest neighbor retrieval even at 10,000+ chunks.</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              4. Retrieval Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/80 space-y-2">
            <p><strong>Method:</strong> Hybrid Sparse + Dense</p>
            <p><strong>Pipeline:</strong> BM25 keyword matching combined with cosine similarity, fetching top-K=5.</p>
            <p><strong>Rationale:</strong> Dense vectors alone struggle with exact part numbers or acronyms. Hybrid retrieval ensures we catch both semantic intent and exact entity matches.</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <AlertTriangle className="h-32 w-32 text-destructive" />
        </div>
        <h3 className="text-lg font-bold text-destructive mb-4 flex items-center gap-2 relative z-10">
          <AlertTriangle className="h-5 w-5" />
          Failure Modes & Mitigations
        </h3>
        <div className="space-y-4 relative z-10">
          <div>
            <h4 className="font-semibold text-foreground">Hallucination with partial context</h4>
            <p className="text-sm text-muted-foreground">If retrieval fails to find the correct chunk, the LLM may try to answer from pre-training.</p>
            <p className="text-sm font-medium mt-1 text-foreground/80">Mitigation: Strict system prompts enforcing "I don't know" fallback and forcing explicit inline source citations.</p>
          </div>
          <div className="pt-2 border-t border-destructive/10">
            <h4 className="font-semibold text-foreground">Multi-hop ambiguity</h4>
            <p className="text-sm text-muted-foreground">Queries requiring synthesis across wildly different documents can return low-relevance chunks on first pass.</p>
            <p className="text-sm font-medium mt-1 text-foreground/80">Handling: The system handles partial answers gracefully, allowing follow-up queries that act as a multi-hop retrieval step.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
