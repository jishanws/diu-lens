'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Upload, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const QUERY_IMAGE_KEY = 'diu_lens_query_image';

export default function AdminSearchPage() {
  const router = useRouter();
  const [isMatching, setIsMatching] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const hasImage = useMemo(() => Boolean(previewUrl), [previewUrl]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedFileName(file.name);

    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      const result = e.target?.result as string;
      setPreviewUrl(result);
    };
    fileReader.readAsDataURL(file);
  };

  const startMockMatch = () => {
    if (!previewUrl) {
      return;
    }

    setIsMatching(true);
    sessionStorage.setItem(QUERY_IMAGE_KEY, previewUrl);

    window.setTimeout(() => {
      setIsMatching(false);
      router.push('/admin/results');
    }, 1500);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <Card className="border-border bg-card text-foreground">
        <CardHeader>
          <CardTitle className="text-foreground">Upload Query Image</CardTitle>
          <CardDescription className="text-muted-foreground">
            Upload a clear frontal image for best identification confidence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label
            htmlFor="query-image-upload"
            className="group block cursor-pointer rounded-2xl border border-dashed border-[#8BB8D0]/30 bg-[#8BB8D0]/5 p-8 text-center transition-colors hover:border-[#8BB8D0]/50 hover:bg-[#8BB8D0]/10"
          >
            <div className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-full border border-[#8BB8D0]/20 bg-[#8BB8D0]/10 text-[#8BB8D0]">
              <Upload className="size-6" />
            </div>
            <p className="font-medium text-foreground">Drop an image here, or click to browse</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Supports JPG, PNG, or WEBP. Suggested resolution: 512x512 or higher.
            </p>
            <input
              id="query-image-upload"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onFileChange}
            />
          </label>

          {hasImage ? (
            <div className="rounded-xl border border-border bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">Preview: {selectedFileName}</p>
              <div className="relative mt-3 h-72 w-full overflow-hidden rounded-lg">
                <Image
                  src={previewUrl ?? ''}
                  alt="Uploaded query"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/35 p-4 text-sm text-muted-foreground">
              No image selected yet.
            </div>
          )}

          <Button className="h-10 w-full sm:w-auto" onClick={startMockMatch} disabled={!hasImage || isMatching}>
            <WandSparkles className="size-4" />
            {isMatching ? 'Processing Mock Match...' : 'Start Match'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border bg-card text-foreground">
        <CardHeader>
          <CardTitle className="text-foreground">Search Notes</CardTitle>
          <CardDescription className="text-muted-foreground">Frontend placeholder controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-lg border border-border bg-muted/35 p-3">
            <p className="font-medium text-foreground">Status Filter</p>
            <p className="mt-1 text-muted-foreground">All campus records (mock)</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/35 p-3">
            <p className="font-medium text-foreground">Confidence Preference</p>
            <p className="mt-1 text-muted-foreground">Above 80% (mock)</p>
          </div>
          <div className="rounded-lg border border-amber-300/20 bg-amber-500/10 p-3 text-amber-100">
            This page simulates upload and match workflow only; no face model runs yet.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
