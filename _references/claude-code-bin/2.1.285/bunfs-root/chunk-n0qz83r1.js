// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Pe}from"/$bunfs/root/chunk-675ch139.js";var Vhn="HKLM\\SOFTWARE\\Policies\\ClaudeCode",qhn="HKCU\\SOFTWARE\\Policies\\ClaudeCode",QBt="Settings";var I1o=5000,l2r=2097152,P1o="/mnt/c/Windows/System32/reg.exe",zD="/mnt/c/Program Files/ClaudeCode";function Emt(){if(process.env.WSL_DISTRO_NAME)return!0;try{let e=Pe("fs").readFileSync("/proc/version","utf8").toLowerCase();return e.includes("microsoft")||e.includes("wsl")}catch{return!1}}
export{Vhn,qhn,QBt,I1o,l2r,P1o,zD,Emt};
