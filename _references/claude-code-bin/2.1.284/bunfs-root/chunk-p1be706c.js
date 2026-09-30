// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Re}from"/$bunfs/root/chunk-2dxhgqgt.js";var Zhn="HKLM\\SOFTWARE\\Policies\\ClaudeCode",eyn="HKCU\\SOFTWARE\\Policies\\ClaudeCode",_1t="Settings";var w1o=5000,BGr=2097152,v1o="/mnt/c/Windows/System32/reg.exe",j0="/mnt/c/Program Files/ClaudeCode";function Omt(){if(process.env.WSL_DISTRO_NAME)return!0;try{let e=Re("fs").readFileSync("/proc/version","utf8").toLowerCase();return e.includes("microsoft")||e.includes("wsl")}catch{return!1}}
export{Zhn,eyn,_1t,w1o,BGr,v1o,j0,Omt};
