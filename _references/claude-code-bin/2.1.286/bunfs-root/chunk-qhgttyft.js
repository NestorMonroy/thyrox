// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Wh}from"/$bunfs/root/chunk-99bwgrc6.js";import{fe}from"/$bunfs/root/chunk-sg1zq61w.js";import{Lg}from"/$bunfs/root/chunk-rp25v7gd.js";function uT(r){console.error(fe.red(r))}function Vt(r,e="cli_error"){if(r)uT(r);Wh(e),process.exit(1);return}function mw(r){if(r)process.stdout.write(r+`
`);process.exit(0);return}async function Wp(r){await new Promise((e)=>{process.stdout.write(r,()=>e())})}function uk(r){process.stderr.write(fe.yellow(Lg(r))+`
`)}async function HJ(){try{let{flushAnalyticsSinks:r}=await import("/$bunfs/root/chunk-3k5r803d.js");await r()}catch{}}async function Yo(r){await HJ(),process.exit(r);return}async function ni(r){return await HJ(),Vt(r)}async function uN(r){if(r)process.stdout.write(r+`
`);return await HJ(),mw()}
export{uT,Vt,mw,Wp,uk,HJ,Yo,ni,uN};
