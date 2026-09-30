// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import"/$bunfs/root/chunk-2j44ssk9.js";import"/$bunfs/root/chunk-vyyazxfq.js";import"/$bunfs/root/chunk-ern0s5ks.js";import"/$bunfs/root/chunk-jxwbd5gq.js";import"/$bunfs/root/chunk-yqm14hey.js";import"/$bunfs/root/chunk-4cnes656.js";import"/$bunfs/root/chunk-bnk68ax9.js";import"/$bunfs/root/chunk-b1cxch1w.js";import"/$bunfs/root/chunk-v49zfq06.js";import"/$bunfs/root/chunk-s1pmhfks.js";import"/$bunfs/root/chunk-nvht7ckf.js";import"/$bunfs/root/chunk-8nz62976.js";import"/$bunfs/root/chunk-djetmnb8.js";import"/$bunfs/root/chunk-zkn0228z.js";import"/$bunfs/root/chunk-19wkka67.js";import"/$bunfs/root/chunk-vq0drrah.js";import"/$bunfs/root/chunk-fmsbxtrp.js";import"/$bunfs/root/chunk-d96wy6r5.js";import"/$bunfs/root/chunk-vrkqvgpe.js";import{nn}from"/$bunfs/root/chunk-repqv23t.js";async function i(r,s){let t=o(r.remote,r.inputPrompt);if(t===null)return nn("Error: claude -p --cloud needs a task: pass it as the prompt, as --cloud's value, or on stdin.");let{runHeadlessCloudPrint:e}=await import("/$bunfs/root/chunk-tpchhhee.js");return e(r,s,{prompt:t,outputFormat:r.outputFormat==="json"?"json":"text"})}function o(r,s){let t=[r??"",typeof s==="string"?s:""].filter((e)=>e.trim()!=="");return t.length===0?null:t.join(`
`)}export{i as runHeadlessCloudPrintArm};
