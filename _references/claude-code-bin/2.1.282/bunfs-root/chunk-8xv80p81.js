// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Id}from"/$bunfs/root/chunk-x8sh3mk0.js";import{S7n}from"/$bunfs/root/chunk-c00d51yp.js";import{Fp}from"/$bunfs/root/chunk-1kqpjzff.js";import{Zo}from"/$bunfs/root/chunk-b34mxhmz.js";import{EI}from"/$bunfs/root/chunk-qt64yd4t.js";function Nbn(){return[{type:"text",text:S7n()}]}function GFo(){Zo({name:EI,description:`Reference for writing a ${Id} tool script (script API and gotchas, resume, quality patterns, worked examples). Load before authoring a script for a workflow the user already opted into; it does not itself authorize running one.`,menuDescription:"Load the reference for writing Workflow tool scripts",userInvocable:!0,isEnabled:()=>Fp(),async getPromptForCommand(){return Nbn()}})}
export{Nbn,GFo};
