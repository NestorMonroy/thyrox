// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{xd}from"/$bunfs/root/chunk-7sva5f6c.js";import{vMn}from"/$bunfs/root/chunk-00jxty08.js";import{Gu}from"/$bunfs/root/chunk-hy1xv27b.js";import{Mo}from"/$bunfs/root/chunk-r3gx110s.js";import{jC}from"/$bunfs/root/chunk-jjq7ev4g.js";function PXt(){return[{type:"text",text:vMn()}]}function yno(){Mo({name:jC,description:`Reference for writing a ${xd} tool script (script API and gotchas, resume, quality patterns, worked examples). Load before authoring a script for a workflow the user already opted into; it does not itself authorize running one.`,menuDescription:"Load the reference for writing Workflow tool scripts",userInvocable:!0,isEnabled:()=>Gu(),async getPromptForCommand(){return PXt()}})}
export{PXt,yno};
