// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{ou}from"/$bunfs/root/chunk-v412cjtd.js";import{Pcn}from"/$bunfs/root/chunk-94d0ybjr.js";import{Bc}from"/$bunfs/root/chunk-pbnppgd9.js";import{po}from"/$bunfs/root/chunk-n30wnctq.js";import{hk}from"/$bunfs/root/chunk-1z1etq0d.js";function xDt(){return[{type:"text",text:Pcn()}]}function ySr(){po({name:hk,description:`Reference for writing a ${ou} tool script (script API and gotchas, resume, quality patterns, worked examples). Load before authoring a script for a workflow the user already opted into; it does not itself authorize running one.`,menuDescription:"Load the reference for writing Workflow tool scripts",userInvocable:!0,isEnabled:()=>Bc(),async getPromptForCommand(){return xDt()}})}
export{xDt,ySr};
