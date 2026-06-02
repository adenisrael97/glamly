import type { CreateReviewInput, CreateReviewResult } from "@glamly/shared";
import { client, unwrap } from "./client";

export const reviewsApi = {
  create(input: CreateReviewInput): Promise<CreateReviewResult> {
    return unwrap<CreateReviewResult>(client.post("/reviews", input));
  },
};
