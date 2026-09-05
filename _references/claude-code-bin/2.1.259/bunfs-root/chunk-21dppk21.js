// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{ke}from"/$bunfs/root/chunk-qyvz15br.js";var Mkt="HKLM\\SOFTWARE\\Policies\\ClaudeCode",Okt="HKCU\\SOFTWARE\\Policies\\ClaudeCode",_et="Settings";var _ur=5000,sRn=2097152,bur="/mnt/c/Windows/System32/reg.exe",DI="/mnt/c/Program Files/ClaudeCode";function HUe(){if(process.env.WSL_DISTRO_NAME)return!0;try{let e=ke("fs").readFileSync("/proc/version","utf8").toLowerCase();return e.includes("microsoft")||e.includes("wsl")}catch{return!1}}
export{Mkt,Okt,_et,_ur,sRn,bur,DI,HUe};
