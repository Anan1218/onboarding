export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}
