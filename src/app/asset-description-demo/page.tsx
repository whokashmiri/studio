
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AssetDescriptionDemoPage() {
  const { toast } = useToast();

  // The AssetDescriptionInput component has been removed.
  // This demo page is now simplified.
  // You can re-purpose this page or remove it.

  const showDemoToast = () => {
    toast({
      title: "Demo Page Interaction",
      description: "The AssetDescriptionInput component was previously showcased here but has been refactored into the main asset creation flow.",
    });
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex justify-center items-start min-h-screen">
      <Card className="w-full max-w-2xl mt-8">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl font-headline">Asset Creation Flow Demo</CardTitle>
          <CardDescription>
            The asset creation process has been refactored.
            You can test the new multi-step flow by creating a new asset within a project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            The previous <code>AssetDescriptionInput</code> component has been removed. 
            Its functionalities (photo handling, voice input, text input, AI summary) are now integrated 
            into the new multi-step asset creation page.
          </p>
          <Link href="/" passHref>
            <Button variant="outline">Go to Homepage to Create/Edit Assets</Button>
          </Link>
          <Button onClick={showDemoToast}>Show Demo Toast</Button>
        </CardContent>
      </Card>
    </div>
  );
}
