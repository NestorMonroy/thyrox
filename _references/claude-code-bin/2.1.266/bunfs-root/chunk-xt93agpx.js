// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{nf}from"/$bunfs/root/chunk-xdb7bs7g.js";import{ie}from"/$bunfs/root/chunk-jxgr13c3.js";import{QP}from"/$bunfs/root/chunk-hfjb09vk.js";function QL(r){console.error(ie.red(r))}function pn(r,e="cli_error"){if(r)QL(r);nf(e),process.exit(1);return}function xv(r){if(r)process.stdout.write(r+`
`);process.exit(0);return}async function bw(r){await new Promise((e)=>{process.stdout.write(r,()=>e())})}function Z_(r){process.stderr.write(ie.yellow(QP(r))+`
`)}async function oue(){try{let{flushAnalyticsSinks:r}=await import("/$bunfs/root/chunk-5p7hap63.js");await r()}catch{}}async function _s(r){await oue(),process.exit(r);return}async function yi(r){return await oue(),pn(r)}async function tO(r){if(r)process.stdout.write(r+`
`);return await oue(),xv()}
export{QL,pn,xv,bw,Z_,oue,_s,yi,tO};
