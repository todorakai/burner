'use client';

import { useRouter } from 'next/navigation';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className='absolute top-1/2 left-1/2 mb-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-center'>
      <Flame className="h-20 w-20 text-orange-500 mx-auto mb-6" />
      <span className='from-foreground bg-linear-to-b to-transparent bg-clip-text text-[10rem] leading-none font-extrabold text-transparent'>
        404
      </span>
      <h2 className='font-heading my-2 text-2xl font-bold'>
        This page burned 🔥
      </h2>
      <p>
        Sorry, the page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <div className='mt-8 flex justify-center gap-2'>
        <Button onClick={() => router.back()} variant='default' size='lg'>
          Go back
        </Button>
        <Button
          onClick={() => router.push('/dashboard/burner')}
          variant='ghost'
          size='lg'
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
