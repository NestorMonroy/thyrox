// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Ce}from"/$bunfs/root/chunk-0dapr5gw.js";var Tin="HKLM\\SOFTWARE\\Policies\\ClaudeCode",Ain="HKCU\\SOFTWARE\\Policies\\ClaudeCode",F0t="Settings";var PEo=5000,XIr=2097152,HEo="/mnt/c/Windows/System32/reg.exe",r0="/mnt/c/Program Files/ClaudeCode";function Xat(){if(process.env.WSL_DISTRO_NAME)return!0;try{let e=Ce("fs").readFileSync("/proc/version","utf8").toLowerCase();return e.includes("microsoft")||e.includes("wsl")}catch{return!1}}
export{Tin,Ain,F0t,PEo,XIr,HEo,r0,Xat};
