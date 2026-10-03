// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{q,j}from"/$bunfs/root/chunk-bxhyh54r.js";import{u}from"/$bunfs/root/chunk-hjabkkf1.js";import{a}from"/$bunfs/root/chunk-5054mktj.js";import{ap,Or,rH}from"/$bunfs/root/chunk-61992r1j.js";var r="--inherit-permission-mode";function s(e){return e===r||e.startsWith(`${r}=`)}class m{mode}var c=new q(()=>new m);function f(){return c.of(j().host)}function tno({inheritPermissionModeCli:e,resolvedMode:n,storageV5:i}){if(!e)return;f().mode=n,rH("--permission-mode",[r],n,void 0,i).catch((o)=>u(o))}async function nno(e){let n=f(),i=n.mode;if(i===void 0)return;let o=a.CLAUDE_JOB_DIR;if(!o||a.CLAUDE_CODE_SESSION_KIND!=="bg"){n.mode=void 0;return}let t=await Or(o,e);if(!t?.respawnFlags)return;if(!t.respawnFlags.some(s)){n.mode=void 0;return}await rH("--permission-mode",[r],i,void 0,e,void 0,(p)=>p.some(s)),ap(o);let d=await Or(o,e);if(d?.respawnFlags&&!d.respawnFlags.some(s))n.mode=void 0}
export{tno,nno};
