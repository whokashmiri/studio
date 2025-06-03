"use client";
import type { ChangeEvent } from 'react';
import { useState, useEffect, useRef } from 'react';
import { Mic, Send, BrainCircuit, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { summarizeAssetDescription, type SummarizeAssetDescriptionInput } from '@/ai/flows/summarize-asset-description';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'; // Assuming this is meant to be self-contained
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from '@/contexts/language-context';


interface AssetDescriptionInputProps {
  initialDescription?: string;
  onSave: (description: string, summary?: string) => void;
  assetName?: string; 
}

export function AssetDescriptionInput({ initialDescription = '', onSave, assetName }: AssetDescriptionInputProps) {
  const [description, setDescription] = useState(initialDescription);
  const [isListening, setIsListening] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summary, setSummary] = useState<string | undefined>(undefined);
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(false);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();
  const { language, t } = useLanguage();

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setSpeechRecognitionAvailable(true);
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      speechRecognitionRef.current = new SpeechRecognitionAPI();
      const recognition = speechRecognitionRef.current;
      recognition.continuous = false; // Stop after first phrase
      recognition.interimResults = false;
      recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setDescription(prev => prev ? `${prev} ${transcript}`.trim() : transcript);
        setIsListening(false);
      };
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error);
        let errorMessage = event.error;
        if (event.error === 'no-speech') errorMessage = 'No speech detected. Please try again.';
        else if (event.error === 'audio-capture') errorMessage = 'Audio capture failed. Check microphone permissions.';
        else if (event.error === 'not-allowed') errorMessage = 'Microphone access denied. Please allow microphone access.';
        toast({ title: 'Speech Recognition Error', description: errorMessage, variant: 'destructive' });
        setIsListening(false);
      };
      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      setSpeechRecognitionAvailable(false);
    }
  }, [toast, language]);
  
  // Update recognition language if app language changes
  useEffect(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.lang = language === 'ar' ? 'ar-SA' : 'en-US';
    }
  }, [language]);


  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  };

  const toggleListening = () => {
    if (!speechRecognitionRef.current || !speechRecognitionAvailable) {
      toast({ title: 'Feature Not Available', description: 'Speech recognition is not supported or enabled in your browser.', variant: 'destructive' });
      return;
    }
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Error starting speech recognition:", e);
        toast({ title: 'Could not start speech recognition', description: 'Please ensure microphone permissions are granted.', variant: 'destructive' });
        setIsListening(false);
      }
    }
  };
  
  const handleGenerateSummary = async () => {
    if (!description.trim()) {
      toast({ title: 'Cannot Summarize', description: 'Description is empty.', variant: 'destructive' });
      return;
    }
    setIsLoadingSummary(true);
    setSummary(undefined);
    try {
      const input: SummarizeAssetDescriptionInput = { assetDescription: description };
      const result = await summarizeAssetDescription(input);
      if (result.summary) {
        setSummary(result.summary);
        toast({ title: 'Summary Generated', description: 'AI summary created successfully.' });
      } else {
        toast({ title: 'Summarization Failed', description: 'Could not generate summary.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error summarizing:', error);
      toast({ title: 'Summarization Error', description: 'An unexpected error occurred while generating the summary.', variant: 'destructive' });
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleSave = () => {
    if (!assetName && !description.trim()) {
         toast({ title: "Missing Information", description: "Please provide an asset name or description.", variant: "destructive" });
         return;
    }
    onSave(description, summary);
  };

  return (
    <div className="w-full space-y-4"> {/* Removed Card to make it embeddable */}
      <div className="space-y-2">
        <Label htmlFor="asset-description" className="text-base font-medium">{t('description', 'Description')}</Label>
        <Textarea
          id="asset-description"
          value={description}
          onChange={handleInputChange}
          placeholder={t('typeOrUseSpeech', 'Type or use voice to enter description...')}
          rows={6}
          className="resize-y"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {speechRecognitionAvailable && (
          <Button onClick={toggleListening} variant="outline" className="flex-grow sm:flex-grow-0">
            <Mic className={`mr-2 h-4 w-4 ${isListening ? 'animate-pulse text-destructive' : ''}`} />
            {isListening ? t('listening', 'Listening...') : t('useSpeech', 'Use Speech')}
          </Button>
        )}
        <Button 
          onClick={handleGenerateSummary} 
          variant="outline" 
          className="flex-grow sm:flex-grow-0"
          disabled={isLoadingSummary || !description.trim()}
        >
          <BrainCircuit className="mr-2 h-4 w-4" />
          {isLoadingSummary ? t('summarizing', 'Summarizing...') : t('aiSummary', 'AI Summary')}
        </Button>
      </div>
      
      {!speechRecognitionAvailable && (
        <Alert variant="default">
          <Info className="h-4 w-4" />
          <AlertTitle>Speech Recognition Not Available</AlertTitle>
          <AlertDescription>
            Your browser does not support speech recognition, or it is not enabled. You can still type the description manually.
          </AlertDescription>
        </Alert>
      )}

      {summary && (
        <div className="space-y-2 rounded-md border bg-muted/50 p-4">
          <Label className="font-semibold text-base">{t('aiGeneratedSummary', 'AI Generated Summary:')}</Label>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summary}</p>
        </div>
      )}
      <div className="flex justify-end pt-4">
         <Button onClick={handleSave} size="lg">
           <Send className="mr-2 h-4 w-4" />
           {t('saveDescription', 'Save Description & Asset')}
         </Button>
      </div>
    </div>
  );
}
