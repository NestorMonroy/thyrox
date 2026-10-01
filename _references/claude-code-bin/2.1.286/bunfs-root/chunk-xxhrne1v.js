// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Oe}from"/$bunfs/root/chunk-qr34qg3p.js";var Abn="HKLM\\SOFTWARE\\Policies\\ClaudeCode",Cbn="HKCU\\SOFTWARE\\Policies\\ClaudeCode",cWt="Settings";var a2o=5000,zqr=2097152,l2o="/mnt/c/Windows/System32/reg.exe",hD="/mnt/c/Program Files/ClaudeCode";function Eht(){if(process.env.WSL_DISTRO_NAME)return!0;try{let e=Oe("fs").readFileSync("/proc/version","utf8").toLowerCase();return e.includes("microsoft")||e.includes("wsl")}catch{return!1}}
export{Abn,Cbn,cWt,a2o,zqr,l2o,hD,Eht};
