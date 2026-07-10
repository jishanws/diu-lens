export function enrollmentResponseMessage(
  value: { message: string; errors?: unknown },
  responseOk: boolean
): string {
  if (responseOk || !Array.isArray(value.errors)) {
    return value.message;
  }

  const validationMessages = value.errors
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const message = (entry as Record<string, unknown>).msg;
      return typeof message === 'string' && message.trim()
        ? message.trim().replace(/^Value error,\s*/i, '')
        : null;
    })
    .filter((message): message is string => Boolean(message));

  return validationMessages.length > 0
    ? validationMessages.join('; ')
    : value.message;
}
