// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{lo}from"/$bunfs/root/chunk-5wq5hbjb.js";import{Lt}from"/$bunfs/root/chunk-9hfc9ag5.js";var uKr="main",dBe={name:"Claude Code file sync",email:"noreply@anthropic.com"},pKr="refs/seed/root",IRe=104857600,r=1048576,n=160;function v2t(e,t){let o=Math.min(r,Math.floor(e/16));return Math.max(0,e-o-n*t)}var C9e=3;function Dht(e){let t=e.largest.slice(0,C9e).map((o)=>`${lo(o.path,{maxCodeUnits:512})} (${Lt(o.bytes)})`);return`its files come to ${Lt(e.totalBytes)}, which with packaging does not fit the ${Lt(e.capBytes)} a cloud session can start with from a folder${t.length>0?`; the largest: ${t.join(", ")}`:""}`}var EJn="Remove or ignore what the session does not need (a .gitignore in this folder is honoured) and start again",E2t=2147483648,uBe={repoPass:"tengu_dir_sync_folder_repo",seed:"tengu_dir_sync_folder_seed"};
export{uKr,dBe,pKr,IRe,v2t,C9e,Dht,EJn,E2t,uBe};
