// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{V,Qt,z}from"/$bunfs/root/chunk-x1rrg5j2.js";import{h}from"/$bunfs/root/chunk-6rkpsn9e.js";import{a}from"/$bunfs/root/chunk-m92n5xra.js";import{Rc,Zn,mT}from"/$bunfs/root/chunk-m1g84jsb.js";import{rl}from"/$bunfs/root/chunk-31e4aq9f.js";var r="--inherit-permission-mode";function i(n){return n===r||n.startsWith(`${r}=`)}class u{mode}var l=new V(()=>new u);function m(){return l.of(z().host)}function eKn({inheritPermissionModeCli:n,resolvedMode:t,storageV5:e}){if(!n)return;m().mode=t,mT("--permission-mode",[r],t,void 0,e).catch((o)=>h(o))}async function tKn(n){let t=m(),e=t.mode;if(e===void 0)return;let o=a.CLAUDE_JOB_DIR;if(!o||a.CLAUDE_CODE_SESSION_KIND!=="bg"){t.mode=void 0;return}let p=await Zn(o,n);if(!p?.respawnFlags)return;if(!p.respawnFlags.some(i)){t.mode=void 0;return}await mT("--permission-mode",[r],e,void 0,n,void 0,(d)=>d.some(i)),Rc(o);let s=await Zn(o,n);if(s?.respawnFlags&&!s.respawnFlags.some(i))t.mode=void 0}function S(){return rl({value:"",active:!1,launchWarning:null,vimMode:"INSERT",stash:null})}var c=new Qt(()=>S());function CM(n){return c.of(n)}function nKn(n){return CM(n).getState().value}function _ue(n,t){n.setState((e)=>{if(e.value===t)return e;if(e.launchWarning!==null&&e.value!==""&&t==="")return{...e,value:t,launchWarning:null};return{...e,value:t}})}function Tcn(n,t){n.setState((e)=>e.stash===t?e:{...e,stash:t})}function Bft(n,t){n.setState((e)=>e.active===t?e:{...e,active:t})}function bBt(n,t){Bft(CM(n),t)}function V4e(n,t){CM(n).setState((e)=>e.vimMode===t?e:{...e,vimMode:t})}function Ccn(n,t){n.setState((e)=>e.launchWarning?.type===t.type&&e.launchWarning.prefillLength===t.prefillLength?e:{...e,launchWarning:t})}function Icn(n,t){Ccn(CM(n),t)}
export{eKn,tKn,CM,nKn,_ue,Tcn,Bft,bBt,V4e,Ccn,Icn};
