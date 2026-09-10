// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Kc}from"/$bunfs/root/chunk-kdjptdyq.js";import{Won}from"/$bunfs/root/chunk-ga1wgkns.js";import{Sbe}from"/$bunfs/root/chunk-3860s2eg.js";import{Ac}from"/$bunfs/root/chunk-zqxcvx6m.js";import{to}from"/$bunfs/root/chunk-29fd2a8x.js";import{dA}from"/$bunfs/root/chunk-0khpmnvx.js";function ILt(){return[{type:"text",text:Won()}]}function Ivr(){to({name:dA,description:`Reference for writing a ${Kc} tool script (script API and gotchas, resume, quality patterns, worked examples). Load before authoring a script for a workflow the user already opted into; it does not itself authorize running one.`,menuDescription:"Load the reference for writing Workflow tool scripts",userInvocable:!0,isEnabled:()=>Ac()&&!Sbe(),async getPromptForCommand(){return ILt()}})}
export{ILt,Ivr};
