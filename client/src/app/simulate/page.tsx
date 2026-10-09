import { notFound } from 'next/navigation';
import SimulationPicker from './picker';
import { VisualSettingsProvider } from '@/components/settings/VisualSettings';

export default function SimulatePage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <VisualSettingsProvider><SimulationPicker /></VisualSettingsProvider>;
}
