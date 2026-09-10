// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Ff}from"/$bunfs/root/chunk-e0egp0nd.js";import{ie}from"/$bunfs/root/chunk-8xbkt625.js";import{ux}from"/$bunfs/root/chunk-tcap6yb8.js";function Y$(r){console.error(ie.red(r))}function un(r,e="cli_error"){if(r)Y$(r);Ff(e),process.exit(1);return}function YH(r){if(r)process.stdout.write(r+`
`);process.exit(0);return}async function VS(r){await new Promise((e)=>{process.stdout.write(r,()=>e())})}function w_(r){process.stderr.write(ie.yellow(ux(r))+`
`)}async function ble(){try{let{flushAnalyticsSinks:r}=await import("/$bunfs/root/chunk-kwgfpd57.js");await r()}catch{}}async function _s(r){await ble(),process.exit(r);return}async function di(r){return await ble(),un(r)}async function ZP(r){if(r)process.stdout.write(r+`
`);return await ble(),YH()}
export{Y$,un,YH,VS,w_,ble,_s,di,ZP};
