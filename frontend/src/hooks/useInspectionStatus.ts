import { useQuery } from '@tanstack/react-query';
import { inspectionStatusApi } from '../api/inspection-status.api';

export const useInspectionStatus = (year?: number) => {
  return useQuery({
    queryKey: ['inspection-status', 'missing', year],
    queryFn: () => inspectionStatusApi.getMissingInspections(year),
    staleTime: 60000,
  });
};
