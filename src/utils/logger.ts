/**
 * Production-ready Custom Console Logger
 * Mimics winston's interface with zero external dependencies to prevent module loading errors.
 */
export const logger = {
  info: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
    if (meta && Object.keys(meta).length > 0) {
      console.log(`\x1b[32m${timestamp} [info]: ${message}\x1b[0m`, meta);
    } else {
      console.log(`\x1b[32m${timestamp} [info]: ${message}\x1b[0m`);
    }
  },
  warn: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
    if (meta && Object.keys(meta).length > 0) {
      console.warn(`\x1b[33m${timestamp} [warn]: ${message}\x1b[0m`, meta);
    } else {
      console.warn(`\x1b[33m${timestamp} [warn]: ${message}\x1b[0m`);
    }
  },
  error: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
    if (meta && Object.keys(meta).length > 0) {
      console.error(`\x1b[31m${timestamp} [error]: ${message}\x1b[0m`, meta);
    } else {
      console.error(`\x1b[31m${timestamp} [error]: ${message}\x1b[0m`);
    }
  },
  debug: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
    if (meta && Object.keys(meta).length > 0) {
      console.debug(`\x1b[36m${timestamp} [debug]: ${message}\x1b[0m`, meta);
    } else {
      console.debug(`\x1b[36m${timestamp} [debug]: ${message}\x1b[0m`);
    }
  }
};

export default logger;
