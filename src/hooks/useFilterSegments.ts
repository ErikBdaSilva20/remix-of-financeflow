import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { listFilterSegments, createFilterSegment as apiCreate, updateFilterSegment as apiUpdate, removeFilterSegment } from "@/lib/data/filter_segments.repo";
import type { FilterSegment, FilterSegmentInsert, FilterSegmentUpdate } from "@/lib/data/filter_segments.repo";

export type { FilterSegment };
export type SegmentType = 'project' | 'department' | 'product' | 'region';
export type FilterSegmentInput = FilterSegmentInsert;

export function useFilterSegments(segmentType?: SegmentType) {
  const queryClient = useQueryClient();

  const { data: segments = [], isLoading, error } = useQuery({
    queryKey: ["filter-segments", segmentType],
    queryFn: async () => {
      const rows = await listFilterSegments();
      return rows
        .filter(s => s.is_active && (segmentType ? s.segment_type === segmentType : true))
        .sort((a, b) => a.segment_value.localeCompare(b.segment_value));
    },
  });

  const createSegment = useMutation({
    mutationFn: (input: FilterSegmentInsert) => apiCreate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filter-segments"] });
      toast({ title: "Segment created", description: "The filter segment has been added successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating segment", description: error.message, variant: "destructive" });
    },
  });

  const updateSegment = useMutation({
    mutationFn: ({ id, input }: { id: string; input: FilterSegmentUpdate }) => apiUpdate(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filter-segments"] });
      toast({ title: "Segment updated", description: "The filter segment has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating segment", description: error.message, variant: "destructive" });
    },
  });

  const deleteSegment = useMutation({
    mutationFn: (id: string) => removeFilterSegment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filter-segments"] });
      toast({ title: "Segment deleted", description: "The filter segment has been removed successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting segment", description: error.message, variant: "destructive" });
    },
  });

  return {
    segments,
    isLoading,
    error,
    createSegment: createSegment.mutate,
    updateSegment: updateSegment.mutate,
    deleteSegment: deleteSegment.mutate,
    isCreating: createSegment.isPending,
    isUpdating: updateSegment.isPending,
    isDeleting: deleteSegment.isPending,
  };
}

export function useSegmentValuesByType() {
  const { segments } = useFilterSegments();
  const getSegmentValues = (type: SegmentType): string[] =>
    segments.filter(s => s.segment_type === type).map(s => s.segment_value);
  return {
    projects: getSegmentValues('project'),
    departments: getSegmentValues('department'),
    products: getSegmentValues('product'),
    regions: getSegmentValues('region'),
  };
}
