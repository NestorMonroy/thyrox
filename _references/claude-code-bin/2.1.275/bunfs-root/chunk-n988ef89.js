// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Om}from"/$bunfs/root/chunk-q4s29khb.js";import{de}from"/$bunfs/root/chunk-gw27mnrz.js";import{eI}from"/$bunfs/root/chunk-00c21wvv.js";function $D(r){console.error(de.red(r))}function yn(r,e="cli_error"){if(r)$D(r);Om(e),process.exit(1);return}function nE(r){if(r)process.stdout.write(r+`
`);process.exit(0);return}async function Oy(r){await new Promise((e)=>{process.stdout.write(r,()=>e())})}function LS(r){process.stderr.write(de.yellow(eI(r))+`
`)}async function a5(){try{let{flushAnalyticsSinks:r}=await import("/$bunfs/root/chunk-ap68n6tf.js");await r()}catch{}}async function hs(r){await a5(),process.exit(r);return}async function Ri(r){return await a5(),yn(r)}async function AO(r){if(r)process.stdout.write(r+`
`);return await a5(),nE()}
export{$D,yn,nE,Oy,LS,a5,hs,Ri,AO};
