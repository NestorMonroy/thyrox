// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{z,B}from"/$bunfs/root/chunk-t8q7n4ta.js";import{h}from"/$bunfs/root/chunk-jvycdhmw.js";import{a}from"/$bunfs/root/chunk-9fmxymtw.js";import{Lc,tr,PC}from"/$bunfs/root/chunk-7tfkwhcm.js";var r="--inherit-permission-mode";function s(e){return e===r||e.startsWith(`${r}=`)}class m{mode}var u=new z(()=>new m);function f(){return u.of(B().host)}function O4n({inheritPermissionModeCli:e,resolvedMode:n,storageV5:i}){if(!e)return;f().mode=n,PC("--permission-mode",[r],n,void 0,i).catch((o)=>h(o))}async function D4n(e){let n=f(),i=n.mode;if(i===void 0)return;let o=a.CLAUDE_JOB_DIR;if(!o||a.CLAUDE_CODE_SESSION_KIND!=="bg"){n.mode=void 0;return}let t=await tr(o,e);if(!t?.respawnFlags)return;if(!t.respawnFlags.some(s)){n.mode=void 0;return}await PC("--permission-mode",[r],i,void 0,e,void 0,(p)=>p.some(s)),Lc(o);let d=await tr(o,e);if(d?.respawnFlags&&!d.respawnFlags.some(s))n.mode=void 0}
export{O4n,D4n};
