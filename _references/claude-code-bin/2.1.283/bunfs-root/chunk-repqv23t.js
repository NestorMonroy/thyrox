// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{fh}from"/$bunfs/root/chunk-19wkka67.js";import{pe}from"/$bunfs/root/chunk-vrkqvgpe.js";import{P_}from"/$bunfs/root/chunk-7mrb3rm9.js";function hx(r){console.error(pe.red(r))}function nn(r,e="cli_error"){if(r)hx(r);fh(e),process.exit(1);return}function Rw(r){if(r)process.stdout.write(r+`
`);process.exit(0);return}async function Oh(r){await new Promise((e)=>{process.stdout.write(r,()=>e())})}function DE(r){process.stderr.write(pe.yellow(P_(r))+`
`)}async function Ole(){try{let{flushAnalyticsSinks:r}=await import("/$bunfs/root/chunk-3eszhden.js");await r()}catch{}}async function Ms(r){await Ole(),process.exit(r);return}async function $i(r){return await Ole(),nn(r)}async function aL(r){if(r)process.stdout.write(r+`
`);return await Ole(),Rw()}
export{hx,nn,Rw,Oh,DE,Ole,Ms,$i,aL};
