// La fuente era un stub (`unknown`). Las fases del spinner son las que el
// binario 2.1.275 declara en el evento `stream_mode`; el color es la terna
// que `utils.ts` interpola componente a componente.
export type SpinnerMode =
  | 'tool-input'
  | 'tool-use'
  | 'requesting'
  | 'responding'
  | 'thinking'

export type RGBColor = { r: number; g: number; b: number }
