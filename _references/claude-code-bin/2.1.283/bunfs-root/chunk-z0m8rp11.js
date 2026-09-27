// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Ce}from"/$bunfs/root/chunk-ghttqp33.js";var Zfn="HKLM\\SOFTWARE\\Policies\\ClaudeCode",emn="HKCU\\SOFTWARE\\Policies\\ClaudeCode",zFt="Settings";var yNo=5000,RBr=2097152,_No="/mnt/c/Windows/System32/reg.exe",C0="/mnt/c/Program Files/ClaudeCode";function Ipt(){if(process.env.WSL_DISTRO_NAME)return!0;try{let e=Ce("fs").readFileSync("/proc/version","utf8").toLowerCase();return e.includes("microsoft")||e.includes("wsl")}catch{return!1}}
export{Zfn,emn,zFt,yNo,RBr,_No,C0,Ipt};
