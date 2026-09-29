// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{we}from"/$bunfs/root/chunk-d37h8mav.js";import{loe}from"/$bunfs/root/chunk-zy97v06w.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{O}from"/$bunfs/root/chunk-320rdak1.js";import{Il}from"/$bunfs/root/chunk-akb28a3m.js";import{homedir as o}from"os";var Olr="CLAUDE_CODE_RELAUNCH_HOME_TRUST";async function Vno(){let r=await Il(process.pid);if(r===void 0)return{};return{[Olr]:`${process.pid}:${r}`}}async function qno(){let r=/^(\d{1,10}):(.{1,64})$/.exec(a.CLAUDE_CODE_RELAUNCH_HOME_TRUST??"");if(!r)return!1;let e=O()==="windows"?process.ppid:process.pid;if(Number(r[1])!==e)return!1;if(!loe(we(),o()))return!1;let t=await Il(e,{skipCache:!0});return t!==void 0&&t===r[2]}
export{Olr,Vno,qno};
