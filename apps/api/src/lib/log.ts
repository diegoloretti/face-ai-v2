type Level = 'debug' | 'info' | 'warn' | 'error'

export type Logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => void
  info: (msg: string, meta?: Record<string, unknown>) => void
  warn: (msg: string, meta?: Record<string, unknown>) => void
  error: (msg: string, errOrMeta?: Error | Record<string, unknown>) => void
}

export function createLogger(base: { correlationId: string }): Logger {
  function emit(level: Level, msg: string, extra: Record<string, unknown> = {}) {
    const payload = {
      ts: new Date().toISOString(),
      level,
      msg,
      correlationId: base.correlationId,
      ...extra,
    }
    process.stdout.write(`${JSON.stringify(payload)}\n`)
  }

  return {
    debug: (msg, meta) => emit('debug', msg, meta),
    info: (msg, meta) => emit('info', msg, meta),
    warn: (msg, meta) => emit('warn', msg, meta),
    error: (msg, errOrMeta) => {
      if (errOrMeta instanceof Error) {
        emit('error', msg, {
          error: { message: errOrMeta.message, stack: errOrMeta.stack },
        })
      } else {
        emit('error', msg, errOrMeta)
      }
    },
  }
}
