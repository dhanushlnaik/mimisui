export const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string, error?: unknown) => {
    console.error(`[ERROR] ${msg}`);
    if (error) console.error(error);
  }
};
