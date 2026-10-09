import { notFound } from 'next/navigation';
import Preview from './fixture';
export default function ReviewPage() { if(process.env.NODE_ENV !== 'development') notFound(); return <Preview />; }
