// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Ce}from"/$bunfs/root/chunk-3z5w4bh8.js";var OVt="HKLM\\SOFTWARE\\Policies\\ClaudeCode",MVt="HKCU\\SOFTWARE\\Policies\\ClaudeCode",Bbt="Settings";var xVr=5000,Ltr=2097152,IVr="/mnt/c/Windows/System32/reg.exe",gP="/mnt/c/Program Files/ClaudeCode";function wXe(){if(process.env.WSL_DISTRO_NAME)return!0;try{let e=Ce("fs").readFileSync("/proc/version","utf8").toLowerCase();return e.includes("microsoft")||e.includes("wsl")}catch{return!1}}
export{OVt,MVt,Bbt,xVr,Ltr,IVr,gP,wXe};
