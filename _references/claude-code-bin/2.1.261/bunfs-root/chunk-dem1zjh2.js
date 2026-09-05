// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{ve}from"/$bunfs/root/chunk-934z9d80.js";var Zkt="HKLM\\SOFTWARE\\Policies\\ClaudeCode",eTt="HKCU\\SOFTWARE\\Policies\\ClaudeCode",wet="Settings";var qir=5000,ERn=2097152,Kir="/mnt/c/Windows/System32/reg.exe",dR="/mnt/c/Program Files/ClaudeCode";function _Ue(){if(process.env.WSL_DISTRO_NAME)return!0;try{let e=ve("fs").readFileSync("/proc/version","utf8").toLowerCase();return e.includes("microsoft")||e.includes("wsl")}catch{return!1}}
export{Zkt,eTt,wet,qir,ERn,Kir,dR,_Ue};
