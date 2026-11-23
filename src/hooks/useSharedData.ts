import { useContext } from 'react';
import { SharedDataContext, type SharedData } from '../context/SharedDataContext';

export function useSharedData(): SharedData {
  const ctx = useContext(SharedDataContext);
  if (!ctx) throw new Error('useSharedData must be used inside <SharedDataProvider>');
  return ctx;
}
