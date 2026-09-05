// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{xxd as n}from"/$bunfs/root/_837.js";class t{proc;constructor(r=process){this.proc=r}isJetBrainsIdeTerminal(){return this.proc.env.TERMINAL_EMULATOR==="JetBrains-JediTerm"}isMicrosoftWindowsTerminal(){return this.proc.platform==="win32"&&!!this.proc.env.WT_SESSION}isGhostty(){return this.proc.env.TERM==="xterm-ghostty"||this.proc.env.TERM_PROGRAM==="ghostty"}isMintty(){if(this.proc.env.TERM_PROGRAM==="mintty")return!0;if(this.proc.platform==="win32"&&this.proc.env.MSYSTEM)return!0;return!1}windowsConsoleSupportsVirtualTerminalSequences(){if(this.isMicrosoftWindowsTerminal())return!0;if(this.proc.platform==="win32"&&this.proc.env.TERM_PROGRAM==="vscode"&&this.proc.env.TERM_PROGRAM_VERSION)return!0;if(this.isMintty())return!0;return!1}hasGeometricShapesInkBleedBug(){return this.isGhostty()}hasOsc52ClipboardUtf8Bug(){if(this.proc.env.TERM_PROGRAM!=="vscode")return!1;let r=o(this.proc.env.TERM_PROGRAM_VERSION);return r!==null&&r>=1123000&&r<1125000}macCmdClickArrivesWithoutSgrModifierBit(){return this.proc.platform==="darwin"&&(this.proc.env.TERM_PROGRAM==="ghostty"||this.proc.env.TERM_PROGRAM==="WarpTerminal")}}function o(r){if(!r)return null;let e=/^(\d+)\.(\d+)\.(\d+)/.exec(r);if(!e)return null;return+e[1]*1e6+ +e[2]*1000+ +e[3]}var s;var i=n(()=>{s=new t});
export{s as b1b,i as c1b};
