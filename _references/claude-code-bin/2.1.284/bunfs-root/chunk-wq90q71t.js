// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{rn}from"/$bunfs/root/chunk-8zeg9165.js";import{egn,C6n,x6n}from"/$bunfs/root/chunk-swk3rjnt.js";import{O9e}from"/$bunfs/root/chunk-e1ahn80a.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{j8}from"/$bunfs/root/chunk-btnvcsdx.js";import{Bgr}from"/$bunfs/root/chunk-r5wc9fzv.js";import{zLn}from"/$bunfs/root/chunk-77kn462z.js";import{Sn}from"/$bunfs/root/chunk-0pbw9fcy.js";var Hgr=["Docs"],t=new Set(["claudedocs","claudepages"]);function qOn(e){return e.tier==="core"&&Hgr.some((o)=>j8(e.title)===j8(o))}var Mdo="The Docs type is filled only through the first-party Claude Docs connector, which is not attached in this session: for a document, make a page instead of starting from that type.";function lAt(e){return e.config.type==="claudeai-proxy"&&O9e(e.config)&&zLn(e.config)||Bgr()&&e.config.type==="sdk"&&rn(e.name)!==null&&t.has(x6n(e.serverInfo?.name??""))||a.CLAUDE_CODE_REMOTE===!0&&e.config.type==="http"&&e.config.scope==="dynamic"&&(C6n(e.config)||egn.has(e.name))}function KOn(e){return e.some((o)=>(o.type==="connected"||o.type==="pending")&&lAt(o))}var r="Claude Preview",s="Claude Browser",i=Sn(r),c=Sn(s),m=new Set([i,c]);function SMe(e){return m.has(Sn(e))}function MXt(e,o){let n=`mcp__${Sn(e)}__${o}`;return{async checkPermissions(){return{behavior:"ask",message:`${e} requires permission.`,suggestions:[{type:"addRules",rules:[{toolName:n,ruleContent:void 0}],behavior:"allow",destination:"session"}],metadata:{command:{name:n,chrome:{hostHandlesOriginConsent:!0}}}}}}}
export{Hgr,qOn,Mdo,lAt,KOn,SMe,MXt};
