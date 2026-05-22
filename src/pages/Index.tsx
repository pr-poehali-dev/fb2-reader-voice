import { useState } from 'react';
import { parseFB2, FB2Book } from '@/lib/fb2parser';
import UploadScreen from '@/components/UploadScreen';
import ReaderView from '@/components/ReaderView';

export default function Index() {
  const [book, setBook] = useState<FB2Book | null>(null);

  const handleLoad = (xmlText: string) => {
    try {
      const parsed = parseFB2(xmlText);
      setBook(parsed);
    } catch {
      alert('Не удалось распознать файл. Убедитесь, что это корректный FB2.');
    }
  };

  if (book) {
    return <ReaderView book={book} onUnload={() => setBook(null)} />;
  }

  return <UploadScreen onLoad={handleLoad} />;
}
