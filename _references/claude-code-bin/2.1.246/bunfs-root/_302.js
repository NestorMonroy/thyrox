// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{vzc as t,yzc as a}from"/$bunfs/root/_683.js";import{Khd as n,Ohd as c}from"/$bunfs/root/_823.js";import{Axd as s,xxd as o}from"/$bunfs/root/_837.js";import{stripVTControlCharacters as u}from"util";function f(r){console.error(t.red(r))}function l(r){if(r)f(r);n("cli_error"),process.exit(1);return}function p(r){if(r)process.stdout.write(r+`
`);process.exit(0);return}async function y(r){await new Promise((i)=>{process.stdout.write(r,()=>i())})}function d(r){return u(r).replace(/(?![\t\n])[\p{Cc}\p{Cf}\u2028\u2029]/gu,"")}function g(r){process.stderr.write(t.yellow(d(r))+`
`)}async function e(){try{let{flushAnalyticsSinks:r}=await import("/$bunfs/root/chunk-2c16j267.js");await r()}catch{}}async function A(r){await e(),process.exit(r);return}async function h(r){return await e(),l(r)}async function C(r){if(r)process.stdout.write(r+`
`);return await e(),p()}var x=o(()=>{a();c()});
export{f as EF,l as FF,p as GF,y as HF,d as IF,g as JF,e as KF,A as LF,h as MF,C as NF,x as OF};
