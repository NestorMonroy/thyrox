// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Te}from"/$bunfs/root/chunk-7sg5wrey.js";var zxt="HKLM\\SOFTWARE\\Policies\\ClaudeCode",Wxt="HKCU\\SOFTWARE\\Policies\\ClaudeCode",Jnt="Settings";var Ppr=5000,eMn=2097152,Hpr="/mnt/c/Windows/System32/reg.exe",qx="/mnt/c/Program Files/ClaudeCode";function I2e(){if(process.env.WSL_DISTRO_NAME)return!0;try{let e=Te("fs").readFileSync("/proc/version","utf8").toLowerCase();return e.includes("microsoft")||e.includes("wsl")}catch{return!1}}
export{zxt,Wxt,Jnt,Ppr,eMn,Hpr,qx,I2e};
