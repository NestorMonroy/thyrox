// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Axd as t,xxd as r}from"/$bunfs/root/_837.js";function l(){if(process.env.WSL_DISTRO_NAME)return!0;try{let e=t("fs").readFileSync("/proc/version","utf8").toLowerCase();return e.includes("microsoft")||e.includes("wsl")}catch{return!1}}var o="HKLM\\SOFTWARE\\Policies\\ClaudeCode",n="HKCU\\SOFTWARE\\Policies\\ClaudeCode",a="Settings",i=5000,c="/mnt/c/Windows/System32/reg.exe",p="/mnt/c/Program Files/ClaudeCode";var s=()=>{};
export{o as gIc,n as hIc,a as iIc,i as jIc,c as kIc,p as lIc,l as mIc,s as nIc};
