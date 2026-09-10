// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import"/$bunfs/root/chunk-8a7jwk3w.js";import"/$bunfs/root/chunk-r8601mcq.js";import"/$bunfs/root/chunk-jmxayrtv.js";import"/$bunfs/root/chunk-78nzsrc6.js";import"/$bunfs/root/chunk-yqdggex4.js";import"/$bunfs/root/chunk-bxegdt3f.js";import"/$bunfs/root/chunk-k6vqz9fa.js";import"/$bunfs/root/chunk-m3vzz9tz.js";import"/$bunfs/root/chunk-1p8thh7t.js";import"/$bunfs/root/chunk-1m0n2kwr.js";import"/$bunfs/root/chunk-06whp1c5.js";import"/$bunfs/root/chunk-mh9y4c2z.js";import{Ff}from"/$bunfs/root/chunk-w8jp0t25.js";import"/$bunfs/root/chunk-kqpqzcmv.js";import"/$bunfs/root/chunk-r1xh498w.js";import"/$bunfs/root/chunk-0d0nn4ae.js";import"/$bunfs/root/chunk-71zhb9jr.js";import{_s}from"/$bunfs/root/chunk-x9py4bf4.js";import"/$bunfs/root/chunk-ah1kb8zv.js";import"/$bunfs/root/chunk-p3hagek4.js";import"/$bunfs/root/chunk-y9tkdj4c.js";import{Hn}from"/$bunfs/root/chunk-9c9242q9.js";import{Zb,xl,Ic,YE}from"/$bunfs/root/chunk-x7s5nmns.js";import{nd}from"/$bunfs/root/chunk-zwqvwgpn.js";import{Zxe,Kat}from"/$bunfs/root/chunk-c5ddta38.js";import"/$bunfs/root/chunk-rr7qj8e9.js";import"/$bunfs/root/chunk-vmja0gjy.js";import{spawn as E}from"child_process";import{closeSync as v}from"fs";import{constants as p}from"os";import{isatty as u}from"tty";function d(){for(let r=0;r<32;r++){if(r===1||r===2)continue;try{if(u(r))v(r)}catch{}}}async function U({proactivity:r}={}){if(await new Promise((e)=>setImmediate(e)),!await YE())return await Hn("agent_launcher","relaunch_launcher_not_runnable"),process.stderr.write(`
${Ic()??`${Zb}: launcher \`${xl()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting), then start claude again`}
`),_s(1);let{cmd:n,prefixArgs:a}=nd(),c=process.argv.slice(2),t={...process.env};delete t[Zxe],Object.assign(t,Kat());let i=E(n,[...a,...c],{stdio:"inherit",env:t});d();let s=["SIGINT","SIGTERM","SIGHUP"];for(let e of s)process.on(e,()=>{try{i.kill(e)}catch{}});return new Promise(()=>{i.on("close",(e,o)=>{let l=o?128+(p.signals[o]??0):0;process.exit(e??l)}),i.on("error",(e)=>{process.stderr.write(`Failed to relaunch Claude Code: ${e.message}
`),Ff("relaunch_child_error"),process.exit(1)})})}export{U as execRelaunch};
