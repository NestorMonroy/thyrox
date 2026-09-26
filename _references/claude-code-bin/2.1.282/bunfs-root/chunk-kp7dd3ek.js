// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Ce}from"/$bunfs/root/chunk-j14wpeqn.js";var Icn="HKLM\\SOFTWARE\\Policies\\ClaudeCode",Pcn="HKCU\\SOFTWARE\\Policies\\ClaudeCode",mLt="Settings";var GRo=5000,cMr=2097152,VRo="/mnt/c/Windows/System32/reg.exe",P0="/mnt/c/Program Files/ClaudeCode";function $ct(){if(process.env.WSL_DISTRO_NAME)return!0;try{let e=Ce("fs").readFileSync("/proc/version","utf8").toLowerCase();return e.includes("microsoft")||e.includes("wsl")}catch{return!1}}
export{Icn,Pcn,mLt,GRo,cMr,VRo,P0,$ct};
