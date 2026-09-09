// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Yd}from"/$bunfs/root/chunk-btbsn9s4.js";import{RO,zyn,d_,jA,_S}from"/$bunfs/root/chunk-yw4jc948.js";import{ue}from"/$bunfs/root/chunk-fmze7yw8.js";async function adt({toolUseContext:e,forkContextMessages:t,mainThreadAgentDefinition:o}){let{systemPrompt:s,userContext:r,systemContext:m}=zyn()??await i(e,o);return{systemPrompt:s,userContext:r,systemContext:m,toolUseContext:e,forkContextMessages:t,advisorModel:e.getAdvisorSetting()}}async function i(e,t){let[o,s,r]=await Promise.all([e.renderedSystemPrompt??n(e,t),jA(e.session,e.storageV5,e.credentials),d_(e.session,e.options.cacheBreakerPhrase)]);return{systemPrompt:o,userContext:s,systemContext:r}}async function n(e,t){let o=ue(e),s=await _S(e.options.tools,Yd({permissionMode:o.mode,mainLoopModel:e.options.mainLoopModel}),Array.from(o.additionalWorkingDirectories.keys()));return RO({mainThreadAgentDefinition:t,toolUseContext:e,customSystemPrompt:e.options.customSystemPrompt,defaultSystemPrompt:s,appendSystemPrompt:e.options.appendSystemPrompt})}
export{adt};
