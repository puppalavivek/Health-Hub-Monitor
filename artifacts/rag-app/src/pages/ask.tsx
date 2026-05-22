import { useState, useRef, useEffect } from "react";
import { useListQueryHistory, getListQueryHistoryQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Send, FileText, ExternalLink, ArrowRight, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Ask() {
  const [query, setQuery] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: history, isLoading: historyLoading } = useListQueryHistory({ query: { queryKey: getListQueryHistoryQueryKey() } });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [answer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isStreaming) return;

    setIsStreaming(true);
    setAnswer("");
    setSources([]);

    try {
      const res = await fetch('/api/query', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ question: query }) 
      });
      
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'sources') {
                setSources(data.sources);
              } else if (data.type === 'chunk') {
                setAnswer(prev => prev + data.content);
              }
            } catch (e) {
              // ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
      setAnswer("Error connecting to the query service. Please check your connection or system status.");
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Ask Corpus</h1>
          <p className="text-muted-foreground mt-1">Semantic search across all ingested documents.</p>
        </div>

        <Card className="flex-1 flex flex-col shadow-md overflow-hidden bg-card/50">
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            {answer || isStreaming || sources.length > 0 ? (
              <div className="space-y-6">
                <div className="bg-primary/10 text-primary p-4 rounded-lg rounded-tl-none font-medium border border-primary/20 w-fit max-w-[80%] inline-block">
                  {query}
                </div>
                
                <div className="bg-card border p-6 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-primary font-medium">
                    <Search className="h-4 w-4" />
                    Generated Answer
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90">
                    {answer ? (
                      <div className="whitespace-pre-wrap leading-relaxed">{answer}</div>
                    ) : isStreaming ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Gathering sources and thinking...
                      </div>
                    ) : null}
                    {isStreaming && answer && (
                      <span className="animate-pulse inline-block ml-1 bg-primary w-2 h-4 align-middle"></span>
                    )}
                  </div>
                </div>

                {sources.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Sources Cited
                    </h3>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {sources.map((source, i) => (
                        <Card key={i} className="bg-muted/50 border-dashed">
                          <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between space-y-0">
                            <CardTitle className="text-xs font-semibold leading-tight line-clamp-2">
                              {source.documentTitle}
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px] ml-2 shrink-0">
                              Chunk {source.chunkIndex}
                            </Badge>
                          </CardHeader>
                          <CardContent className="p-3 pt-0 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                            {source.content}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-primary/50" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Ready to query</h3>
                <p className="max-w-md text-sm">
                  Enter a natural language question below. The system will retrieve relevant chunks from the vector store and generate a cited answer.
                </p>
              </div>
            )}
          </ScrollArea>
          <div className="p-4 bg-background border-t">
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto relative">
              <Input 
                placeholder="Ask about your documents..." 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
                className="pr-12 py-6 text-base bg-card shadow-sm border-muted-foreground/20 focus-visible:ring-primary"
                disabled={isStreaming}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="absolute right-1.5 top-1.5 h-9 w-9 rounded-md" 
                disabled={isStreaming || !query.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>

      <div className="hidden lg:flex w-80 flex-col gap-4 shrink-0">
        <Card className="flex-1 flex flex-col overflow-hidden bg-card/30 border-muted">
          <CardHeader className="py-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              Recent Queries
            </CardTitle>
          </CardHeader>
          <Separator />
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {historyLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))
              ) : history?.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center">No history yet</div>
              ) : (
                history?.map((record) => (
                  <div 
                    key={record.id} 
                    className="group cursor-pointer hover:bg-muted/50 p-2 -mx-2 rounded-md transition-colors"
                    onClick={() => {
                      setQuery(record.question);
                      setAnswer(record.answer || "");
                      setSources([]);
                    }}
                  >
                    <div className="text-sm font-medium leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {record.question}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground/80">{record.sourceCount} sources</span>
                      <span className="text-[10px] text-muted-foreground/60">{formatDistanceToNow(new Date(record.createdAt))}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}

function Badge({ className, variant, ...props }: React.ComponentProps<"div"> & { variant?: string }) {
  return <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`} {...props} />
}
