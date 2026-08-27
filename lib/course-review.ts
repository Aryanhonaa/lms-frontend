export const COURSE_REVIEW_CHECK_EVENT = "lms:course-review-check";

export function requestCourseReviewCheck(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(COURSE_REVIEW_CHECK_EVENT));
}
