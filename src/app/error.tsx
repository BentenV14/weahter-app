'use client';
import { ErrorState } from '@/components/ui/states';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      title="This view couldn’t be displayed"
      message="Try reopening the view. Your saved locations and settings are kept."
      onRetry={reset}
    />
  );
}
