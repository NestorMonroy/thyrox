// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Oe}from"/$bunfs/root/chunk-aw1peprz.js";import{i}from"/$bunfs/root/chunk-bkjq2ptm.js";import{t}from"/$bunfs/root/chunk-4bbpt7sc.js";import{pkt}from"/$bunfs/root/chunk-q4s29khb.js";import{Mu,Jy}from"/$bunfs/root/chunk-xbd48fav.js";import{uEr}from"/$bunfs/root/chunk-ktarprgn.js";import{j8t}from"/$bunfs/root/chunk-dmjr6ks7.js";import{openSync as d}from"fs";import{ReadStream as s}from"tty";class o{override=null;get(){if(this.override!==null)return this.override;if(process.stdin.isTTY){this.override=void 0;return}if(Oe(!1)){this.override=void 0;return}if(j8t()==="mcp"){this.override=void 0;return}try{let n=d("/dev/tty","r"),e=new s(n);return pkt(e),e.on("error",(r)=>{i("tengu_tty_stream_error",Mu(r)),t(`/dev/tty stream error: ${r}`,{level:"debug"})}),e.isTTY=!0,this.override=e,this.override}catch(n){t(`Could not open /dev/tty for stdin override: ${n}`,{level:"error"}),this.override=void 0;return}}reset(){this.override=null}}var f=new o;function AI(n=!1){uEr();let e=f.get(),r={exitOnCtrlC:n};if(e)r.stdin=e;return r.isScreenReaderEnabled=Jy(),r}
export{AI};
