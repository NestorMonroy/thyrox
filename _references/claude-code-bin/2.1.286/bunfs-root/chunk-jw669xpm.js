// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Ee}from"/$bunfs/root/chunk-hbjpbz2q.js";import{Boe}from"/$bunfs/root/chunk-4dvekan0.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{M}from"/$bunfs/root/chunk-hqt9kt0y.js";import{Nl}from"/$bunfs/root/chunk-6cvgqsg4.js";import{homedir as o}from"os";var Dur="CLAUDE_CODE_RELAUNCH_HOME_TRUST";async function Fao(){let r=await Nl(process.pid);if(r===void 0)return{};return{[Dur]:`${process.pid}:${r}`}}async function Uao(){let r=/^(\d{1,10}):(.{1,64})$/.exec(a.CLAUDE_CODE_RELAUNCH_HOME_TRUST??"");if(!r)return!1;let e=M()==="windows"?process.ppid:process.pid;if(Number(r[1])!==e)return!1;if(!Boe(Ee(),o()))return!1;let t=await Nl(e,{skipCache:!0});return t!==void 0&&t===r[2]}
export{Dur,Fao,Uao};
