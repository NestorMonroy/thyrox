/**
 * Autodiagnóstico de la captura del MITM. La captura falla en silencio por
 * varias vías independientes —el certificado no es de confianza, los hosts no
 * se redirigen, el servidor está caído o no acepta conexiones— y el usuario
 * sólo ve una lista vacía. `summarizeDiagnostics` es el núcleo puro: con el
 * resultado de cada comprobación da un veredicto único y, por cada fallo, qué
 * hacer. Las comprobaciones con efectos las corre quien lo llama.
 *
 * Porte de `omniroute: src/mitm/inspector/diagnostics.ts` (MIT).
 */
export interface DiagnosticInput {
  serverRunning: boolean;
  serverReachable: boolean;
  certExists: boolean;
  certTrusted: boolean;
  dnsConfigured: boolean;
}

export interface DiagnosticCheck {
  name: string;
  ok: boolean;
  /** Qué hacer cuando `ok` es falso; `null` si la comprobación pasa. */
  hint: string | null;
}

export interface DiagnosticReport {
  healthy: boolean;
  checks: DiagnosticCheck[];
}

function check(name: string, ok: boolean, failHint: string): DiagnosticCheck {
  return { name, ok, hint: ok ? null : failHint };
}

export function summarizeDiagnostics(input: DiagnosticInput): DiagnosticReport {
  const checks: DiagnosticCheck[] = [
    check(
      "server-running",
      input.serverRunning,
      "The MITM server is not running. Start it from the AgentBridge tab."
    ),
    check(
      "server-reachable",
      input.serverReachable,
      "The MITM server is not accepting connections on its port. Check that the port is free and that you have privileges to bind it."
    ),
    check(
      "cert-exists",
      input.certExists,
      "No MITM certificate has been generated yet. Generate one from the AgentBridge tab."
    ),
    check(
      "cert-trusted",
      input.certTrusted,
      "The MITM root CA is not trusted by the OS store, so TLS interception will fail. Trust the certificate from the AgentBridge tab."
    ),
    check(
      "dns-configured",
      input.dnsConfigured,
      "Target hostnames are not spoofed in /etc/hosts, so traffic never reaches the proxy. Enable DNS for the agent(s) you want to capture."
    ),
  ];
  return { healthy: checks.every((c) => c.ok), checks };
}
