"use client";
import { AssetDescriptionInput } from '@/components/asset-description-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function AssetDescriptionDemoPage() {
  const { toast } = useToast();

  const handleSaveDescription = (description: string, summary?: string) => {
    console.log("Saved Description:", description);
    console.log("Saved Summary:", summary);
    toast({
      title: "Description Saved (Demo)",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white font-code">
            {JSON.stringify({ description, summary }, null, 2)}
          </code>
        </pre>
      ),
    });
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex justify-center items-start min-h-screen">
      <Card className="w-full max-w-2xl mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Asset Description Input Demo</CardTitle>
          <CardDescription>
            Test the component for typing, speech-to-text, and AI summarization.
            The "Save" action here will log to console and show a toast.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssetDescriptionInput 
            assetName="Demo Asset"
            onSave={handleSaveDescription} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
