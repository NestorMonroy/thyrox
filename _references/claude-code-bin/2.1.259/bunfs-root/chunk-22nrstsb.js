// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{$e}from"/$bunfs/root/chunk-jdw11prg.js";import{s}from"/$bunfs/root/chunk-9f9fskgc.js";import{t}from"/$bunfs/root/chunk-fzpv8ev5.js";import{Qnt}from"/$bunfs/root/chunk-xmrr4sh8.js";import{gm,rh}from"/$bunfs/root/chunk-x722nt0q.js";import{xjn}from"/$bunfs/root/chunk-htmwsbwk.js";import{ikt}from"/$bunfs/root/chunk-mtgx4egg.js";import{openSync as o}from"fs";import{ReadStream as d}from"tty";class i{override=null;get(){if(this.override!==null)return this.override;if(process.stdin.isTTY){this.override=void 0;return}if($e(!1)){this.override=void 0;return}if(ikt()==="mcp"){this.override=void 0;return}try{let n=o("/dev/tty","r"),e=new d(n);return Qnt(e),e.on("error",(r)=>{s("tengu_tty_stream_error",gm(r)),t(`/dev/tty stream error: ${r}`,{level:"debug"})}),e.isTTY=!0,this.override=e,this.override}catch(n){t(`Could not open /dev/tty for stdin override: ${n}`,{level:"error"}),this.override=void 0;return}}reset(){this.override=null}}var myr=new i;function cw(n=!1){xjn();let e=myr.get(),r={exitOnCtrlC:n};if(e)r.stdin=e;return r.isScreenReaderEnabled=rh(),r}
export{myr,cw};
