// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{ZOe}from"/$bunfs/root/chunk-wbd83hbn.js";import{gt,CVe}from"/$bunfs/root/chunk-336t1akq.js";import{KOe}from"/$bunfs/root/chunk-b9vx2d3e.js";import{ive}from"/$bunfs/root/chunk-qqd8qrfz.js";async function Tu(r,e,o){let t=gt(r.slug);if(!!e.toolUseId&&t?.lastProbeToolUseId===e.toolUseId)return;let s=Date.now(),[l]=await Promise.all([ZOe(r,e.abortController.signal,e.credentials),ive()?KOe(r,e.abortController.signal):void 0]);CVe(r.slug,l,{consumedByCheck:!0,toolUseId:e.toolUseId,issuedAt:s,debugLabel:o})}async function Uqt(r,e,o){let t=Date.now(),a=await ZOe(r,e.abortController.signal,e.credentials);CVe(r.slug,a,{consumedByCheck:!1,toolUseId:e.toolUseId,issuedAt:t,debugLabel:o})}
export{Tu,Uqt};
