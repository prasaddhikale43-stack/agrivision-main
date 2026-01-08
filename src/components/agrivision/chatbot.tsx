"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgriVisionLogo } from './icons';
import { Send, Bot, User, Paperclip, Mic, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { agriChatbot } from '@/ai/flows/agri-chatbot';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '../ui/progress';

type ContentPart = 
  | { text: string; }
  | { media: { url: string; contentType?: string } };

type Message = {
  role: 'user' | 'model';
  content: ContentPart[];
};

interface ChatbotProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const getFileAsDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function Chatbot({ isOpen, onOpenChange }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (content: ContentPart[]) => {
    if (isLoading || content.length === 0) return;

    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const botResponse = await agriChatbot({
        history: messages,
        message: content,
      });
      
      const botMessage: Message = { role: 'model', content: [{ text: botResponse }] };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMessage: Message = { role: 'model', content: [{ text: 'Sorry, I seem to be having some trouble. Please try again later.' }] };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleSendMessage([{ text: input }]);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const dataUri = await getFileAsDataUri(file);
        handleSendMessage([{ media: { url: dataUri, contentType: file.type } }]);
      } catch (error) {
        toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not process the selected file.' });
      }
      // Reset file input
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        try {
          const dataUri = await getFileAsDataUri(audioBlob);
          handleSendMessage([{ media: { url: dataUri, contentType: 'audio/webm' } }]);
        } catch (error) {
          toast({ variant: 'destructive', title: 'Recording Error', description: 'Could not process the audio.' });
        }
        stream.getTracks().forEach(track => track.stop()); // Stop the mic access
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Microphone Access Denied', description: 'Please enable microphone permissions.' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if(recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      setRecordingTime(0);
    }
  };

  const MessageContent = ({ part }: { part: ContentPart }) => {
    if ('text' in part) {
      return <p className="whitespace-pre-wrap">{part.text}</p>;
    }
    if ('media' in part && part.media.contentType) {
      if (part.media.contentType.startsWith('image/')) {
        return <Image src={part.media.url} alt="User upload" width={200} height={200} className="rounded-md" />;
      }
      if (part.media.contentType.startsWith('video/')) {
        return <video src={part.media.url} controls className="rounded-md w-full max-w-[250px]" />;
      }
      if (part.media.contentType.startsWith('audio/')) {
        return <audio src={part.media.url} controls className="w-full" />;
      }
    }
    return <p className="text-destructive text-sm">[Unsupported content type]</p>;
  };

  return (
    <>
      <Button
        onClick={() => onOpenChange(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 animate-pulse bg-accent hover:bg-accent/90"
        size="icon"
      >
        <AgriVisionLogo className="h-12 w-12 text-accent-foreground" />
        <span className="sr-only">Open AgriBot</span>
      </Button>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
                <AgriVisionLogo className="w-6 h-6 text-primary" />
                AgriBot Assistant
            </SheetTitle>
            <SheetDescription>
              Your AI helper for farming. Ask questions or send photos/audio.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-grow my-4 pr-4 -mr-6" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={cn('flex items-start gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {message.role === 'model' && (
                    <Avatar className="w-8 h-8">
                       <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="w-5 h-5"/></AvatarFallback>
                    </Avatar>
                  )}
                   <div className={cn(
                        "p-3 rounded-lg max-w-[80%]",
                        message.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}>
                      <div className="space-y-2">
                        {message.content.map((part, i) => <MessageContent key={i} part={part} />)}
                      </div>
                    </div>
                  {message.role === 'user' && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                  <div className="flex items-start gap-3 justify-start">
                    <Avatar className="w-8 h-8">
                       <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="w-5 h-5"/></AvatarFallback>
                    </Avatar>
                    <div className="p-3 rounded-lg bg-muted">
                        <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
              )}
            </div>
          </ScrollArea>
          <SheetFooter>
            <div className="w-full space-y-2">
              {isRecording && (
                <div className="flex items-center gap-2">
                  <Progress value={(recordingTime / 60) * 100} className="h-2" />
                  <span className="text-xs text-muted-foreground font-mono w-16 text-right">
                    {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex w-full space-x-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask a question or describe your media..."
                  disabled={isLoading || isRecording}
                />
                 <Input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" id="chat-file-upload" />
                <Button type="button" size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={isLoading || isRecording}>
                    <Paperclip className="h-4 w-4" />
                    <span className="sr-only">Attach file</span>
                </Button>
                {!isRecording ? (
                  <Button type="button" size="icon" variant="ghost" onClick={startRecording} disabled={isLoading}>
                    <Mic className="h-4 w-4" />
                    <span className="sr-only">Record voice message</span>
                  </Button>
                ) : (
                  <Button type="button" size="icon" variant="destructive" onClick={stopRecording}>
                    <StopCircle className="h-4 w-4" />
                    <span className="sr-only">Stop recording</span>
                  </Button>
                )}
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </form>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
