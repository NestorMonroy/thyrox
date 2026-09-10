// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Kc}from"/$bunfs/root/chunk-g15e6ek5.js";import{Ssn}from"/$bunfs/root/chunk-fmz41yt7.js";import{Lc}from"/$bunfs/root/chunk-xrpkk2fp.js";import{eo}from"/$bunfs/root/chunk-jjtchkay.js";import{NE}from"/$bunfs/root/chunk-9bzspx3s.js";function UPt(){return[{type:"text",text:Ssn()}]}function Imr(){eo({name:NE,description:`Reference for writing a ${Kc} tool script (script API and gotchas, resume, quality patterns, worked examples). Load before authoring a script for a workflow the user already opted into; it does not itself authorize running one.`,menuDescription:"Load the reference for writing Workflow tool scripts",userInvocable:!0,isEnabled:()=>Lc(),async getPromptForCommand(){return UPt()}})}
export{UPt,Imr};
