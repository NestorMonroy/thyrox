// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import"/$bunfs/root/chunk-dcawh0q4.js";import"/$bunfs/root/chunk-91n3hqvz.js";import"/$bunfs/root/chunk-fvzv4ke0.js";import"/$bunfs/root/chunk-84mvm17e.js";import"/$bunfs/root/chunk-8w57hkxq.js";import"/$bunfs/root/chunk-a207t0vs.js";import"/$bunfs/root/chunk-annedm50.js";import"/$bunfs/root/chunk-x7f60hk6.js";import"/$bunfs/root/chunk-49q43dms.js";import"/$bunfs/root/chunk-2y9gqtpa.js";import"/$bunfs/root/chunk-xzmtst7a.js";import"/$bunfs/root/chunk-y5pwxex8.js";import{Ff}from"/$bunfs/root/chunk-e0egp0nd.js";import"/$bunfs/root/chunk-py8dsda5.js";import"/$bunfs/root/chunk-e1njvp95.js";import"/$bunfs/root/chunk-020pptsa.js";import"/$bunfs/root/chunk-8xbkt625.js";import{_s}from"/$bunfs/root/chunk-zbp41w2a.js";import"/$bunfs/root/chunk-znctvfkf.js";import"/$bunfs/root/chunk-s0879eds.js";import"/$bunfs/root/chunk-838r2s0v.js";import{Hn}from"/$bunfs/root/chunk-vvf2tdhs.js";import{Qb,xl,Ic,YE}from"/$bunfs/root/chunk-3956xxm3.js";import{td}from"/$bunfs/root/chunk-ppqsqf6x.js";import{Zxe,qat}from"/$bunfs/root/chunk-bnha1v86.js";import"/$bunfs/root/chunk-n2mayd00.js";import"/$bunfs/root/chunk-4qz1hwvq.js";import{spawn as E}from"child_process";import{closeSync as v}from"fs";import{constants as p}from"os";import{isatty as u}from"tty";function d(){for(let r=0;r<32;r++){if(r===1||r===2)continue;try{if(u(r))v(r)}catch{}}}async function U({proactivity:r}={}){if(await new Promise((e)=>setImmediate(e)),!await YE())return await Hn("agent_launcher","relaunch_launcher_not_runnable"),process.stderr.write(`
${Ic()??`${Qb}: launcher \`${xl()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting), then start claude again`}
`),_s(1);let{cmd:n,prefixArgs:a}=td(),c=process.argv.slice(2),t={...process.env};delete t[Zxe],Object.assign(t,qat());let i=E(n,[...a,...c],{stdio:"inherit",env:t});d();let s=["SIGINT","SIGTERM","SIGHUP"];for(let e of s)process.on(e,()=>{try{i.kill(e)}catch{}});return new Promise(()=>{i.on("close",(e,o)=>{let l=o?128+(p.signals[o]??0):0;process.exit(e??l)}),i.on("error",(e)=>{process.stderr.write(`Failed to relaunch Claude Code: ${e.message}
`),Ff("relaunch_child_error"),process.exit(1)})})}export{U as execRelaunch};
