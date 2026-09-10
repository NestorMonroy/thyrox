/**
 * Porte de `ccnmt: packages/agent/userPromptKeywords/userPromptKeywords.ts`.
 */

/**
 * Verifica si la entrada coincide con patrones de palabra clave negativa
 * (frustracion, profanidad).
 */
export function matchesNegativeKeyword(input: string): boolean {
  const lowerInput = input.toLowerCase()

  const negativePattern =
    /\b(wtf|wth|ffs|omfg|shit(ty|tiest)?|dumbass|horrible|awful|piss(ed|ing)? off|piece of (shit|crap|junk)|what the (fuck|hell)|fucking? (broken|useless|terrible|awful|horrible)|fuck you|screw (this|you)|so frustrating|this sucks|damn it)\b/

  return negativePattern.test(lowerInput)
}

/**
 * Verifica si la entrada coincide con patrones de "seguir adelante"
 * (continuacion de la tarea en curso).
 */
export function matchesKeepGoingKeyword(input: string): boolean {
  const lowerInput = input.toLowerCase().trim()

  // Coincide con "continue" solo si es el prompt entero.
  if (lowerInput === 'continue') {
    return true
  }

  // Coincide con "keep going" o "go on" en cualquier parte de la entrada.
  const keepGoingPattern = /\b(keep going|go on)\b/
  return keepGoingPattern.test(lowerInput)
}
