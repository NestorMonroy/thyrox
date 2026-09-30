// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{K,W}from"/$bunfs/root/chunk-zwm3fybx.js";import{u}from"/$bunfs/root/chunk-xt60grfb.js";import{a}from"/$bunfs/root/chunk-h56wjcte.js";import{Uu,xr,rH}from"/$bunfs/root/chunk-kda7f0br.js";var r="--inherit-permission-mode";function s(e){return e===r||e.startsWith(`${r}=`)}class m{mode}var c=new K(()=>new m);function f(){return c.of(W().host)}function J4r({inheritPermissionModeCli:e,resolvedMode:n,storageV5:i}){if(!e)return;f().mode=n,rH("--permission-mode",[r],n,void 0,i).catch((o)=>u(o))}async function Q4r(e){let n=f(),i=n.mode;if(i===void 0)return;let o=a.CLAUDE_JOB_DIR;if(!o||a.CLAUDE_CODE_SESSION_KIND!=="bg"){n.mode=void 0;return}let t=await xr(o,e);if(!t?.respawnFlags)return;if(!t.respawnFlags.some(s)){n.mode=void 0;return}await rH("--permission-mode",[r],i,void 0,e,void 0,(p)=>p.some(s)),Uu(o);let d=await xr(o,e);if(d?.respawnFlags&&!d.respawnFlags.some(s))n.mode=void 0}
export{J4r,Q4r};
