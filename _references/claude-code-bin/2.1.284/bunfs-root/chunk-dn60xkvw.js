// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{uo}from"/$bunfs/root/chunk-3xxkkv4v.js";import{Bt}from"/$bunfs/root/chunk-rs4a40mr.js";var Loo="main",fze={name:"Claude Code file sync",email:"noreply@anthropic.com"},Noo="refs/seed/root",kHe=104857600,r=1048576,n=160;function p6t(e,t){let o=Math.min(r,Math.floor(e/16));return Math.max(0,e-o-n*t)}var wet=3;function vEt(e){let t=e.largest.slice(0,wet).map((o)=>`${uo(o.path,{maxCodeUnits:512})} (${Bt(o.bytes)})`);return`its files come to ${Bt(e.totalBytes)}, which with packaging does not fit the ${Bt(e.capBytes)} a cloud session can start with from a folder${t.length>0?`; the largest: ${t.join(", ")}`:""}`}var adr="Remove or ignore what the session does not need (a .gitignore in this folder is honoured) and start again",f6t=2147483648,mze={repoPass:"tengu_dir_sync_folder_repo",seed:"tengu_dir_sync_folder_seed"};
export{Loo,fze,Noo,kHe,p6t,wet,vEt,adr,f6t,mze};
