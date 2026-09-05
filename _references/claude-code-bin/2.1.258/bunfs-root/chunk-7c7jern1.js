// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{$e}from"/$bunfs/root/chunk-ycrs8y50.js";import{s}from"/$bunfs/root/chunk-62em4bpm.js";import{t}from"/$bunfs/root/chunk-5nyank6v.js";import{vtt}from"/$bunfs/root/chunk-pz607n7v.js";import{mm,Zg}from"/$bunfs/root/chunk-8qt7d28b.js";import{mBn}from"/$bunfs/root/chunk-m6fzpzhy.js";import{pAt}from"/$bunfs/root/chunk-v7e33cvv.js";import{openSync as o}from"fs";import{ReadStream as d}from"tty";class i{override=null;get(){if(this.override!==null)return this.override;if(process.stdin.isTTY){this.override=void 0;return}if($e(!1)){this.override=void 0;return}if(pAt()==="mcp"){this.override=void 0;return}try{let n=o("/dev/tty","r"),e=new d(n);return vtt(e),e.on("error",(r)=>{s("tengu_tty_stream_error",mm(r)),t(`/dev/tty stream error: ${r}`,{level:"debug"})}),e.isTTY=!0,this.override=e,this.override}catch(n){t(`Could not open /dev/tty for stdin override: ${n}`,{level:"error"}),this.override=void 0;return}}reset(){this.override=null}}var $pr=new i;function ZH(n=!1){mBn();let e=$pr.get(),r={exitOnCtrlC:n};if(e)r.stdin=e;return r.isScreenReaderEnabled=Zg(),r}
export{$pr,ZH};
