// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Ee}from"/$bunfs/root/chunk-bxhyh54r.js";import{doe}from"/$bunfs/root/chunk-actz3rxp.js";import{a}from"/$bunfs/root/chunk-5054mktj.js";import{O}from"/$bunfs/root/chunk-hjabkkf1.js";import{nc}from"/$bunfs/root/chunk-qfbb586n.js";import{homedir as o}from"os";var Ilr="CLAUDE_CODE_RELAUNCH_HOME_TRUST";async function Dro(){let r=await nc(process.pid);if(r===void 0)return{};return{[Ilr]:`${process.pid}:${r}`}}async function Lro(){let r=/^(\d{1,10}):(.{1,64})$/.exec(a.CLAUDE_CODE_RELAUNCH_HOME_TRUST??"");if(!r)return!1;let e=O()==="windows"?process.ppid:process.pid;if(Number(r[1])!==e)return!1;if(!doe(Ee(),o()))return!1;let t=await nc(e,{skipCache:!0});return t!==void 0&&t===r[2]}
export{Ilr,Dro,Lro};
