// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Ce}from"/$bunfs/root/chunk-sr6jf0k1.js";var Q3t="HKLM\\SOFTWARE\\Policies\\ClaudeCode",Z3t="HKCU\\SOFTWARE\\Policies\\ClaudeCode",ivt="Settings";var L8r=5000,air=2097152,N8r="/mnt/c/Windows/System32/reg.exe",jP="/mnt/c/Program Files/ClaudeCode";function i7e(){if(process.env.WSL_DISTRO_NAME)return!0;try{let e=Ce("fs").readFileSync("/proc/version","utf8").toLowerCase();return e.includes("microsoft")||e.includes("wsl")}catch{return!1}}
export{Q3t,Z3t,ivt,L8r,air,N8r,jP,i7e};
