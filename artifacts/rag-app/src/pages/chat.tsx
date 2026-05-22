import { useState, useRef, useEffect } from "react";
import { 
  useListOpenaiConversations, 
  getListOpenaiConversationsQueryKey,
  useGetOpenaiConversation,
  getGetOpenaiConversationQueryKey,
  useCreateOpenaiConversation,
  useListOpenaiMessages,
  getListOpenaiMessagesQueryKey,
  useDeleteOpenaiConversation
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Plus, Send, Trash2, User, Bot, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: convsLoading } = useListOpenaiConversations({ 
    query: { queryKey: getListOpenaiConversationsQueryKey() } 
  });

  const { data: activeConv } = useGetOpenaiConversation(
    activeConversationId as number,
    { query: { enabled: !!activeConversationId, queryKey: getGetOpenaiConversationQueryKey(activeConversationId as number) } }
  );

  const { data: messages, isLoading: msgsLoading } = useListOpenaiMessages(
    activeConversationId as number,
    { query: { enabled: !!activeConversationId, queryKey: getListOpenaiMessagesQueryKey(activeConversationId as number) } }
  );

  const createMutation = useCreateOpenaiConversation({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        setActiveConversationId(data.id);
      }
    }
  });

  const deleteMutation = useDeleteOpenaiConversation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        setActiveConversationId(null);
        toast({ title: "Conversation deleted" });
      }
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamedContent]);

  const handleNewChat = () => {
    createMutation.mutate({ data: { title: "New Conversation" } });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConversationId || isStreaming) return;

    const userMessage = input;
    setInput("");
    setIsStreaming(true);
    setStreamedContent("");

    // Optimistically update UI could go here if we wanted to manage state manually
    
    try {
      const res = await fetch(`/api/openai/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMessage })
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
              if (data.content) {
                setStreamedContent(prev => prev + data.content);
              } else if (data.done) {
                queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(activeConversationId) });
              }
            } catch (e) {
              // Parse errors for chunks
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error sending message", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setStreamedContent("");
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-card border rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-500">
      {/* Sidebar */}
      <div className="w-72 border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b">
          <Button onClick={handleNewChat} className="w-full gap-2" disabled={createMutation.isPending}>
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {convsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))
            ) : conversations?.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground p-4">No conversations yet</div>
            ) : (
              conversations?.map(conv => (
                <div 
                  key={conv.id}
                  className={`group flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                    activeConversationId === conv.id 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setActiveConversationId(conv.id)}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <MessageCircle className={`h-4 w-4 shrink-0 ${activeConversationId === conv.id ? "text-primary-foreground/70" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium truncate">{conv.title}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 ${activeConversationId === conv.id ? "hover:bg-primary-foreground/20 hover:text-primary-foreground text-primary-foreground" : "text-destructive hover:bg-destructive/10"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this conversation?")) {
                        deleteMutation.mutate({ id: conv.id });
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {activeConversationId ? (
          <>
            <div className="p-4 border-b bg-card flex items-center justify-between shadow-sm z-10">
              <h2 className="font-semibold">{activeConv?.title || "Conversation"}</h2>
              <span className="text-xs text-muted-foreground">GPT-5.4 Powered</span>
            </div>
            
            <ScrollArea className="flex-1 p-6" ref={scrollRef}>
              <div className="space-y-6 max-w-3xl mx-auto">
                {msgsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  messages?.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      {msg.role === 'assistant' && (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className={`p-4 rounded-xl max-w-[80%] ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                          : 'bg-muted/50 border border-border/50 rounded-tl-sm text-foreground/90'
                      }`}>
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                      {msg.role === 'user' && (
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-secondary-foreground" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                
                {/* Streaming Message */}
                {(isStreaming && streamedContent) && (
                  <div className="flex gap-4">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="p-4 rounded-xl max-w-[80%] bg-muted/50 border border-border/50 rounded-tl-sm text-foreground/90">
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                        {streamedContent}
                        <span className="animate-pulse inline-block ml-1 bg-primary w-2 h-4 align-middle"></span>
                      </div>
                    </div>
                  </div>
                )}
                
                {isStreaming && !streamedContent && (
                  <div className="flex gap-4">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" /> Assistant is thinking...
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 bg-card border-t">
              <form onSubmit={handleSend} className="max-w-3xl mx-auto relative">
                <Input 
                  placeholder="Message Assistant..." 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  className="pr-12 py-6 bg-background shadow-sm focus-visible:ring-primary border-muted-foreground/20"
                  disabled={isStreaming}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="absolute right-1.5 top-1.5 h-9 w-9"
                  disabled={isStreaming || !input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="h-16 w-16 mb-4 text-muted" />
            <h3 className="text-lg font-medium text-foreground">AI Assistant</h3>
            <p className="text-sm">Select a conversation or create a new one to start.</p>
            <Button onClick={handleNewChat} className="mt-6" disabled={createMutation.isPending}>
              Create New Chat
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
