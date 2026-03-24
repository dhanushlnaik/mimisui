const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m"
};

function ts() {
  return new Date().toISOString();
}

function fmt(level: "INFO" | "WARN" | "ERROR") {
  const color = level === "INFO" ? c.blue : level === "WARN" ? c.yellow : c.red;
  return `${c.dim}${ts()}${c.reset} ${color}[${level}]${c.reset}`;
}

export const logger = {
  info: (msg: string) => console.log(`${fmt("INFO")} ${msg}`),
  warn: (msg: string, error?: unknown) => {
    console.warn(`${fmt("WARN")} ${msg}`);
    if (error) console.warn(error);
  },
  error: (msg: string, error?: unknown) => {
    console.error(`${fmt("ERROR")} ${msg}`);
    if (error) console.error(error);
  }
};
