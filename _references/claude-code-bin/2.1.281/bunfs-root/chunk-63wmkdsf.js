// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{rn}from"/$bunfs/root/chunk-kp7gknaw.js";import{xon,ZBn,t1n}from"/$bunfs/root/chunk-5khn4tvf.js";import{J4e}from"/$bunfs/root/chunk-b93xrf5w.js";import{a}from"/$bunfs/root/chunk-ay603yys.js";import{j3}from"/$bunfs/root/chunk-ax169ky4.js";import{mQn}from"/$bunfs/root/chunk-hy4tmavc.js";import{fRn}from"/$bunfs/root/chunk-4n4g22z6.js";import{wn}from"/$bunfs/root/chunk-bdy47pnr.js";var S7n=["Docs"],t=new Set(["claudedocs","claudepages"]);function hSn(e){return e.tier==="core"&&S7n.some((o)=>j3(e.title)===j3(o))}var zKr="The Docs type is filled only through the first-party Claude Docs connector, which is not attached in this session: for a document, make a page instead of starting from that type.";function yyt(e){return e.config.type==="claudeai-proxy"&&J4e(e.config)&&fRn(e.config)||mQn()&&e.config.type==="sdk"&&rn(e.name)!==null&&t.has(t1n(e.serverInfo?.name??""))||a.CLAUDE_CODE_REMOTE===!0&&e.config.type==="http"&&e.config.scope==="dynamic"&&(ZBn(e.config)||xon.has(e.name))}function ySn(e){return e.some((o)=>(o.type==="connected"||o.type==="pending")&&yyt(o))}var r="Claude Preview",s="Claude Browser",i=wn(r),c=wn(s),m=new Set([i,c]);function YRe(e){return m.has(wn(e))}function LGt(e,o){let n=`mcp__${wn(e)}__${o}`;return{async checkPermissions(){return{behavior:"ask",message:`${e} requires permission.`,suggestions:[{type:"addRules",rules:[{toolName:n,ruleContent:void 0}],behavior:"allow",destination:"session"}],metadata:{command:{name:n,chrome:{hostHandlesOriginConsent:!0}}}}}}}
export{S7n,hSn,zKr,yyt,ySn,YRe,LGt};
