// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Jt}from"/$bunfs/root/chunk-b1a55n2g.js";import{pmt,hhn,hYn}from"/$bunfs/root/chunk-5d5c7e2g.js";import{M9e}from"/$bunfs/root/chunk-srhvbygf.js";import{a}from"/$bunfs/root/chunk-5054mktj.js";import{J8}from"/$bunfs/root/chunk-y477132g.js";import{vhr}from"/$bunfs/root/chunk-4wym6d44.js";import{yLn}from"/$bunfs/root/chunk-qazw855w.js";import{wn}from"/$bunfs/root/chunk-axx8rx4e.js";var mhr=["Docs"],n=new Set(["claudedocs","claudepages"]);function QOn(e){return e.tier==="core"&&mhr.some((o)=>J8(e.title)===J8(o))}var Ldo="The Docs type is filled only through the first-party Claude Docs connector, which is not attached in this session: for a document, make a page instead of starting from that type.";function wAt(e){return e.config.type==="claudeai-proxy"&&M9e(e.config)&&yLn(e.config)||vhr()&&e.config.type==="sdk"&&Jt(e.name)!==null&&n.has(hYn(e.serverInfo?.name??""))||a.CLAUDE_CODE_REMOTE===!0&&e.config.type==="http"&&e.config.scope==="dynamic"&&(hhn(e.config)||pmt.has(e.name))}function ZOn(e){return e.some((o)=>(o.type==="connected"||o.type==="pending"||o.type==="cached")&&wAt(o))}var r="Claude Preview",s="Claude Browser",i=wn(r),c=wn(s),m=new Set([i,c]);function pMe(e){return m.has(wn(e))}function kXt(e,o){let t=`mcp__${wn(e)}__${o}`;return{async checkPermissions(){return{behavior:"ask",message:`${e} requires permission.`,suggestions:[{type:"addRules",rules:[{toolName:t,ruleContent:void 0}],behavior:"allow",destination:"session"}],metadata:{command:{name:t,chrome:{hostHandlesOriginConsent:!0}}}}}}}
export{mhr,QOn,Ldo,wAt,ZOn,pMe,kXt};
