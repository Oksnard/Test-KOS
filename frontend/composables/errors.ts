/**
 * Человекочитаемое сообщение об ошибке для показа в UI.
 * Технические тексты вида "HTTP 500" подменяются понятным fallback,
 * осмысленные сообщения (в т.ч. русские от бэкенда) сохраняются как есть.
 */
export function userMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && !/^HTTP \d{3}$/.test(error.message)) {
    return error.message;
  }
  return fallback;
}
