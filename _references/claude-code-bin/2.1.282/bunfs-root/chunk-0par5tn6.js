// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{io}from"/$bunfs/root/chunk-c01w1545.js";import{Ft}from"/$bunfs/root/chunk-v142ef84.js";var fYr="main",U1e={name:"Claude Code file sync",email:"noreply@anthropic.com"},mYr="refs/seed/root",eIe=104857600,r=1048576,n=160;function lVt(e,t){let o=Math.min(r,Math.floor(e/16));return Math.max(0,e-o-n*t)}var uJe=3;function I_t(e){let t=e.largest.slice(0,uJe).map((o)=>`${io(o.path,{maxCodeUnits:512})} (${Ft(o.bytes)})`);return`its files come to ${Ft(e.totalBytes)}, which with packaging does not fit the ${Ft(e.capBytes)} a cloud session can start with from a folder${t.length>0?`; the largest: ${t.join(", ")}`:""}`}var Ier="Remove or ignore what the session does not need (a .gitignore in this folder is honoured) and start again",cVt=2147483648,B1e={repoPass:"tengu_dir_sync_folder_repo",seed:"tengu_dir_sync_folder_seed"};
export{fYr,U1e,mYr,eIe,lVt,uJe,I_t,Ier,cVt,B1e};
