// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import"/$bunfs/root/chunk-4a5nddj6.js";import"/$bunfs/root/chunk-rnxz8hs2.js";import"/$bunfs/root/chunk-2bj5eqbj.js";import"/$bunfs/root/chunk-7r0w3nmp.js";import"/$bunfs/root/chunk-35k7s716.js";import"/$bunfs/root/chunk-8bp13hnn.js";import"/$bunfs/root/chunk-1y7zyxh8.js";import"/$bunfs/root/chunk-65nweewy.js";import"/$bunfs/root/chunk-ay603yys.js";import"/$bunfs/root/chunk-kp7gknaw.js";import"/$bunfs/root/chunk-cqc88nqm.js";import"/$bunfs/root/chunk-7yckkh1m.js";import"/$bunfs/root/chunk-dqhw8yqd.js";import"/$bunfs/root/chunk-wfscmafr.js";import"/$bunfs/root/chunk-kcjajdc8.js";import"/$bunfs/root/chunk-nqsdwfmt.js";import"/$bunfs/root/chunk-0n80jtth.js";import"/$bunfs/root/chunk-vzqvvnm0.js";import"/$bunfs/root/chunk-5bxxc6dq.js";import{Yt}from"/$bunfs/root/chunk-0rt7skk2.js";async function i(r,s){let t=o(r.remote,r.inputPrompt);if(t===null)return Yt("Error: claude -p --cloud needs a task: pass it as the prompt, as --cloud's value, or on stdin.");let{runHeadlessCloudPrint:e}=await import("/$bunfs/root/chunk-60f2bsqc.js");return e(r,s,{prompt:t,outputFormat:r.outputFormat==="json"?"json":"text"})}function o(r,s){let t=[r??"",typeof s==="string"?s:""].filter((e)=>e.trim()!=="");return t.length===0?null:t.join(`
`)}export{i as runHeadlessCloudPrintArm};
