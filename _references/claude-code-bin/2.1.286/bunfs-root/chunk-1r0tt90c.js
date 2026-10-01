// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Le}from"/$bunfs/root/chunk-dj0a6j9w.js";import{i}from"/$bunfs/root/chunk-r27mnwfc.js";import{bGt}from"/$bunfs/root/chunk-fkamvb6d.js";import{t}from"/$bunfs/root/chunk-6w550002.js";import{LGt}from"/$bunfs/root/chunk-99bwgrc6.js";import{qd,Hh}from"/$bunfs/root/chunk-z05n00bf.js";import{Bao}from"/$bunfs/root/chunk-h7304a10.js";import{openSync as d}from"fs";import{ReadStream as s}from"tty";class o{override=null;get(){if(this.override!==null)return this.override;if(process.stdin.isTTY){this.override=void 0;return}if(Le(!1)){this.override=void 0;return}if(bGt()==="mcp"){this.override=void 0;return}try{let n=d("/dev/tty","r"),e=new s(n);return LGt(e),e.on("error",(r)=>{i("tengu_tty_stream_error",qd(r)),t(`/dev/tty stream error: ${r}`,{level:"debug"})}),e.isTTY=!0,this.override=e,this.override}catch(n){t(`Could not open /dev/tty for stdin override: ${n}`,{level:"error"}),this.override=void 0;return}}reset(){this.override=null}}var f=new o;function MO(n=!1){Bao();let e=f.get(),r={exitOnCtrlC:n};if(e)r.stdin=e;return r.isScreenReaderEnabled=Hh(),r}
export{MO};
