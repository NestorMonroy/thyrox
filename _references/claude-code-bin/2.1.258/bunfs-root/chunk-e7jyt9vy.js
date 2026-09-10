// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Y,on,W}from"/$bunfs/root/chunk-b1z7jvb2.js";import{h}from"/$bunfs/root/chunk-hfch6q45.js";import{a}from"/$bunfs/root/chunk-sr28hb79.js";import{wc,er,nT}from"/$bunfs/root/chunk-bnc671w7.js";import{Ja}from"/$bunfs/root/chunk-szt6v4n4.js";var r="--inherit-permission-mode";function i(n){return n===r||n.startsWith(`${r}=`)}class u{mode}var l=new Y(()=>new u);function m(){return l.of(W().host)}function vWn({inheritPermissionModeCli:n,resolvedMode:t,storageV5:e}){if(!n)return;m().mode=t,nT("--permission-mode",[r],t,void 0,e).catch((o)=>h(o))}async function kWn(n){let t=m(),e=t.mode;if(e===void 0)return;let o=a.CLAUDE_JOB_DIR;if(!o||a.CLAUDE_CODE_SESSION_KIND!=="bg"){t.mode=void 0;return}let p=await er(o,n);if(!p?.respawnFlags)return;if(!p.respawnFlags.some(i)){t.mode=void 0;return}await nT("--permission-mode",[r],e,void 0,n,void 0,(d)=>d.some(i)),wc(o);let s=await er(o,n);if(s?.respawnFlags&&!s.respawnFlags.some(i))t.mode=void 0}function S(){return Ja({value:"",active:!1,launchWarning:null,vimMode:"INSERT",stash:null})}var c=new on(()=>S());function dM(n){return c.of(n)}function TWn(n){return dM(n).getState().value}function hce(n,t){n.setState((e)=>{if(e.value===t)return e;if(e.launchWarning!==null&&e.value!==""&&t==="")return{...e,value:t,launchWarning:null};return{...e,value:t}})}function asn(n,t){n.setState((e)=>e.stash===t?e:{...e,stash:t})}function Gut(n,t){n.setState((e)=>e.active===t?e:{...e,active:t})}function FOt(n,t){Gut(dM(n),t)}function zqe(n,t){dM(n).setState((e)=>e.vimMode===t?e:{...e,vimMode:t})}function lsn(n,t){n.setState((e)=>e.launchWarning?.type===t.type&&e.launchWarning.prefillLength===t.prefillLength?e:{...e,launchWarning:t})}function csn(n,t){lsn(dM(n),t)}
export{vWn,kWn,dM,TWn,hce,asn,Gut,FOt,zqe,lsn,csn};
