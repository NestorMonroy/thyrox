// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Yt as i,iu as _}from"/$bunfs/root/_189.js";import{k9c as a,n9c as g}from"/$bunfs/root/_771.js";import{ctd as l}from"/$bunfs/root/_827.js";import{pxd as d}from"/$bunfs/root/_836.js";g();l();_();var f=8,b=256;function E(){let n=[],o=0,r=!1,u=!1,m=d();return{noteStagedRow(t){if(t.mount_path!==i)return!1;let e=t.content_sha256,c=typeof e==="string"&&e.length>0&&e.length<=b?e:null;if(c===null){if(!u)u=!0,a("warn","home_seed_stage_without_usable_etag",{});return!1}o++;let s={etag:c,beforeFirstCommand:!r,ordinal:o};n=[...n,s].slice(-f);try{m.emit(s)}catch{a("error","home_seed_announcement_listener_threw",{})}return!0},markFirstCommandDequeued(){r=!0},firstCommandDequeued(){return r},announcements(){return n},announcementCount(){return o},announcementForEtag(t){return n.findLast((e)=>e.etag===t)},announced:{subscribe:m.subscribe}}}
export{b as Gb,E as Hb};
