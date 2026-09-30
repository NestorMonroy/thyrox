// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import"/$bunfs/root/chunk-a7esebzw.js";import"/$bunfs/root/chunk-rfvh2b8a.js";import"/$bunfs/root/chunk-qsnhycbm.js";import"/$bunfs/root/chunk-7tpgnqqk.js";import"/$bunfs/root/chunk-9f6zczff.js";import"/$bunfs/root/chunk-9fmxymtw.js";import"/$bunfs/root/chunk-t8q7n4ta.js";import"/$bunfs/root/chunk-m3k3498d.js";import"/$bunfs/root/chunk-wchdjfbm.js";import"/$bunfs/root/chunk-vkfaczp9.js";import"/$bunfs/root/chunk-vfrpernt.js";import"/$bunfs/root/chunk-fy3j7rz0.js";import{nf}from"/$bunfs/root/chunk-xdb7bs7g.js";import"/$bunfs/root/chunk-xj9n0xxp.js";import"/$bunfs/root/chunk-jvycdhmw.js";import"/$bunfs/root/chunk-554z0m6d.js";import"/$bunfs/root/chunk-jxgr13c3.js";import{_s}from"/$bunfs/root/chunk-xt93agpx.js";import"/$bunfs/root/chunk-52ssfc24.js";import"/$bunfs/root/chunk-kgqcj5g2.js";import"/$bunfs/root/chunk-74qghvre.js";import{An}from"/$bunfs/root/chunk-dzyeyv65.js";import{RS,$l,Fc,Tk}from"/$bunfs/root/chunk-1fd7beg1.js";import{ud}from"/$bunfs/root/chunk-zapjbeg6.js";import{rMe,_ut}from"/$bunfs/root/chunk-0w0620n7.js";import"/$bunfs/root/chunk-928s7kda.js";import"/$bunfs/root/chunk-k9qk789z.js";import{spawn as E}from"child_process";import{closeSync as v}from"fs";import{constants as p}from"os";import{isatty as u}from"tty";function d(){for(let r=0;r<32;r++){if(r===1||r===2)continue;try{if(u(r))v(r)}catch{}}}async function U({proactivity:r}={}){if(await new Promise((e)=>setImmediate(e)),!await Tk())return await An("agent_launcher","relaunch_launcher_not_runnable"),process.stderr.write(`
${Fc()??`${RS}: launcher \`${$l()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting), then start claude again`}
`),_s(1);let{cmd:n,prefixArgs:a}=ud(),c=process.argv.slice(2),t={...process.env};delete t[rMe],Object.assign(t,_ut());let i=E(n,[...a,...c],{stdio:"inherit",env:t});d();let s=["SIGINT","SIGTERM","SIGHUP"];for(let e of s)process.on(e,()=>{try{i.kill(e)}catch{}});return new Promise(()=>{i.on("close",(e,o)=>{let l=o?128+(p.signals[o]??0):0;process.exit(e??l)}),i.on("error",(e)=>{process.stderr.write(`Failed to relaunch Claude Code: ${e.message}
`),nf("relaunch_child_error"),process.exit(1)})})}export{U as execRelaunch};
