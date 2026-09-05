// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{yRt,sOn,Mk,qrt,Ra}from"/$bunfs/root/chunk-x1rrg5j2.js";import{k3}from"/$bunfs/root/chunk-x722nt0q.js";import{_8,l9n,v8n,Opn,M5n,L3n,ymn,Emn,G8,N3n,EEe,s_t,IJn,uO,B_n,uA}from"/$bunfs/root/chunk-qpwbvc04.js";import{zLn,kje}from"/$bunfs/root/chunk-k1wkanbv.js";import{DLn}from"/$bunfs/root/chunk-ta3hhm0z.js";import{Ls}from"/$bunfs/root/chunk-0xd0k64r.js";import{mwn}from"/$bunfs/root/chunk-40xnyyhy.js";import{L9,Drn}from"/$bunfs/root/chunk-6hsr76nc.js";import{rzn}from"/$bunfs/root/chunk-d3v3438t.js";function Prn(t,o=new Set,i,r,l,m=!1){let a=o.size>0;if(v8n(t),kje(t),mwn.of(t).clear(),Drn(L9),uA(),L3n(o),qrt(null),!a)ymn.peek(t)?.clear();let s=Emn();if(s?.getTeleportCacheState().status==="active")s.revertTeleportCache("transcript_cleared");if(G8(t,void 0,i,void 0,void 0,void 0,l),Mk("clear"),uO(),yRt(Ra()),!m)g$t();if(B_n(t,"session_start"),_8.of(t).reset(),Opn.of(t).clear(),EEe.of(t).reset(),i?.((e)=>{if(e.storedImagePaths.size===0&&e.imageDescriptions.size===0&&Object.keys(e.displayedMessageContent).length===0)return e;return{...e,storedImagePaths:new Map,imageDescriptions:new Map,displayedMessageContent:{}}}),l9n(),!a)rzn();if(DLn(),!a)N3n();if(sOn(o),zLn(),IJn(),s_t().catch(()=>{}),M5n(t),r)import("/$bunfs/root/chunk-z091evbc.js").then(({WebFetchCache:e})=>r.get(e).clear()),import("/$bunfs/root/chunk-kbnmj2kv.js").then(({ToolSearchDescriptionCache:e})=>r.get(e).clear());import("/$bunfs/root/chunk-hw8xb4rz.js").then(({clearAgentDefinitionsCache:e})=>e())}function g$t(){let t=Ls();t.bashPromptSkillCommands=void 0,t.workflowAuthoringSkillAvailable=void 0,k3()}
export{Prn,g$t};
