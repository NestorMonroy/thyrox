// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{Ff}from"/$bunfs/root/chunk-w8jp0t25.js";import{ie}from"/$bunfs/root/chunk-71zhb9jr.js";import{dx}from"/$bunfs/root/chunk-v7vff0yy.js";function Y$(r){console.error(ie.red(r))}function un(r,e="cli_error"){if(r)Y$(r);Ff(e),process.exit(1);return}function YH(r){if(r)process.stdout.write(r+`
`);process.exit(0);return}async function VS(r){await new Promise((e)=>{process.stdout.write(r,()=>e())})}function w_(r){process.stderr.write(ie.yellow(dx(r))+`
`)}async function Sle(){try{let{flushAnalyticsSinks:r}=await import("/$bunfs/root/chunk-g6ee0652.js");await r()}catch{}}async function _s(r){await Sle(),process.exit(r);return}async function di(r){return await Sle(),un(r)}async function e0(r){if(r)process.stdout.write(r+`
`);return await Sle(),YH()}
export{Y$,un,YH,VS,w_,Sle,_s,di,e0};
