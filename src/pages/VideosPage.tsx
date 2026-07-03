import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function VideosPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/videos');
  }, [router]);

  return null;
}
