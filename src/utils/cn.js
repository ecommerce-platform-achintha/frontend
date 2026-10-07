// Joins class names and skips falsy values: cn('a', cond && 'b') -> 'a b'.
export function cn(...parts) {
  return parts.flat().filter(Boolean).join(' ')
}
