declare global {
  var mongoose: {
    conn: unknown | null;
    promise: Promise<unknown> | null;
  };
}
