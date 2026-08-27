export type TrainerWorkScope = {
  programId?: string;
  batchId?: string;
};

export function trainerScopeQuery(scope?: TrainerWorkScope): string {
  const params = new URLSearchParams();
  if (scope?.programId) {
    params.set("programId", scope.programId);
  }
  if (scope?.batchId) {
    params.set("batchId", scope.batchId);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
