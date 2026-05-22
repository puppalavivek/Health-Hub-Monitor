import { useGetDocumentStats, getGetDocumentStatsQueryKey, useListQueryHistory, getListQueryHistoryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Database, FileText, LayoutList, Search, MessageSquare, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDocumentStats({ query: { queryKey: getGetDocumentStatsQueryKey() } });
  const { data: history, isLoading: historyLoading } = useListQueryHistory({ query: { queryKey: getListQueryHistoryQueryKey() } });
  const [quickQuery, setQuickQuery] = useState("");
  const [quickAnswer, setQuickAnswer] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);

  const handleQuickAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuery.trim() || isQuerying) return;

    setIsQuerying(true);
    setQuickAnswer("");

    try {
      const res = await fetch('/api/query', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ question: quickQuery }) 
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
              if (data.type === 'chunk') {
                setQuickAnswer(prev => prev + data.content);
              }
            } catch (e) {
              // ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setQuickAnswer("Error connecting to the query service.");
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your retrieval-augmented generation corpus.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FilesIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{stats?.totalDocuments || 0}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vector Chunks</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{stats?.totalChunks || 0}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{stats?.totalQueries || 0}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">Active</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Quick Ask</CardTitle>
            <CardDescription>Test the RAG pipeline directly.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleQuickAsk} className="flex gap-2">
              <Input 
                placeholder="Ask a question..." 
                value={quickQuery} 
                onChange={(e) => setQuickQuery(e.target.value)} 
                disabled={isQuerying}
              />
              <Button type="submit" disabled={isQuerying || !quickQuery.trim()}>
                {isQuerying ? "Asking..." : "Ask"}
              </Button>
            </form>
            {(quickAnswer || isQuerying) && (
              <div className="mt-4 p-4 bg-muted rounded-md text-sm border font-mono">
                {quickAnswer}
                {isQuerying && <span className="animate-pulse inline-block ml-1 bg-primary w-2 h-4 align-middle"></span>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Queries</CardTitle>
              <CardDescription>Latest questions asked to the corpus.</CardDescription>
            </div>
            <Link href="/ask">
              <Button variant="outline" size="sm" className="gap-1">
                Full UI <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historyLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : history && history.length > 0 ? (
                history.slice(0, 4).map((record) => (
                  <div key={record.id} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-sm truncate">{record.question}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground ml-5">
                      <span>{record.sourceCount} sources cited</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-4 text-muted-foreground text-sm border rounded-md border-dashed">
                  No queries yet. Start asking questions!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FilesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M9 15h6" />
      <path d="M9 11h6" />
    </svg>
  )
}
