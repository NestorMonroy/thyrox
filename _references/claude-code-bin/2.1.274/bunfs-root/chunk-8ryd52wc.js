// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{iBe,Alr,$E,Ta}from"/$bunfs/root/chunk-ja309z9r.js";import{yee}from"/$bunfs/root/chunk-27bj2wbx.js";import{w7,ICr,rxr,dxr,Njn,B2n,dzn,X7,kPr,rGn,nFt,vOr,oC,fB}from"/$bunfs/root/chunk-ayyj05ne.js";import{Grr,lJe}from"/$bunfs/root/chunk-pc40tvt4.js";import{Hs}from"/$bunfs/root/chunk-mtq3m0rn.js";import{VZn}from"/$bunfs/root/chunk-p8ybpsqa.js";import{R3n}from"/$bunfs/root/chunk-xvt6q4jb.js";import{yJ,Q0n}from"/$bunfs/root/chunk-g76d4tph.js";import{fvr}from"/$bunfs/root/chunk-s6ar9598.js";import{Obe}from"/$bunfs/root/chunk-9v38wtw7.js";import{Jze}from"/$bunfs/root/chunk-wwvz9ct4.js";import{q_r}from"/$bunfs/root/chunk-ebp0gh1z.js";function X0n(t,r=new Set,i,o,m,l=!1){let a=r.size>0;if(rxr(t),lJe(t),R3n.of(t).clear(),Q0n(yJ),oC(),kPr(r),!a)B2n.peek(t)?.clear();let s=dzn();if(s?.getTeleportCacheState().status==="active")s.revertTeleportCache("transcript_cleared","main");if(X7(t,void 0,i,void 0,void 0,void 0,m),$E("clear"),fB(),iBe(Ta()),!l)mJt();if(rGn(t,"session_start"),w7.of(t).reset(),Njn.of(t).clear(),Obe.of(t).reset(),i?.((e)=>{if(e.storedImagePaths.size===0&&e.imageDescriptions.size===0&&Object.keys(e.displayedMessageContent).length===0)return e;return{...e,storedImagePaths:new Map,imageDescriptions:new Map,displayedMessageContent:{}}}),ICr(),!a)q_r();if(VZn(),!a)fvr();if(Alr(r),Grr(),vOr(),nFt().catch(()=>{}),dxr(t),o)o.get(Jze).clear(),import("/$bunfs/root/chunk-0ffc2h86.js").then(({WebFetchCache:e})=>o.get(e).clear()),import("/$bunfs/root/chunk-6x5mk3j2.js").then(({ToolSearchDescriptionCache:e})=>o.get(e).clear());import("/$bunfs/root/chunk-ck7gp4f7.js").then(({clearAgentDefinitionsCache:e})=>e())}function mJt(){let t=Hs();t.bashPromptSkillCommands=void 0,t.workflowAuthoringSkillAvailable=void 0,yee()}
export{X0n,mJt};
