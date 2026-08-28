export function RequiredMark() {
  return (
    <>
      <span className="ml-0.5 font-semibold text-red-600" aria-hidden="true">
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  );
}
