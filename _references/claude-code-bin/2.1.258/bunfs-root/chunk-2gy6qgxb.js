// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{ve}from"/$bunfs/root/chunk-6zavqkd2.js";var VAt="HKLM\\SOFTWARE\\Policies\\ClaudeCode",qAt="HKCU\\SOFTWARE\\Policies\\ClaudeCode",GBe="Settings";var Jsr=5000,aTn="/mnt/c/Windows/System32/reg.exe",wI="/mnt/c/Program Files/ClaudeCode";function WBe(){if(process.env.WSL_DISTRO_NAME)return!0;try{let e=ve("fs").readFileSync("/proc/version","utf8").toLowerCase();return e.includes("microsoft")||e.includes("wsl")}catch{return!1}}
export{VAt,qAt,GBe,Jsr,aTn,wI,WBe};
