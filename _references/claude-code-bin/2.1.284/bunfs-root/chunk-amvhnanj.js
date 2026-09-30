// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Yr,aR,ce}from"/$bunfs/root/chunk-swk3rjnt.js";import{f}from"/$bunfs/root/chunk-k40f9rxb.js";import{pH}from"/$bunfs/root/chunk-45s965ek.js";import{de,dn,_o,Yn,ct}from"/$bunfs/root/chunk-4mrm0wbk.js";var c=f(()=>Yn(ct({id:de(),title:de().optional(),text:de(),footer:de().optional(),priority:dn().default(0),maxImpressions:dn().default(3),accentBar:_o().default(!0),requiresModel:de().optional()})).default([])),i=[];function u(){let n=aR("tengu_startup_announcements",i),t=c().safeParse(n);return t.success?t.data:i}function s(n){return n.requiresModel===void 0||Yr(n.requiresModel)}function qje(n){let t=pH();if(t.startupAnnouncementPick!==void 0)return t.startupAnnouncementPick;let r=ce().announcementImpressions??{},o=u().filter((e)=>(r[e.id]??0)<e.maxImpressions&&s(e)).sort((e,a)=>a.priority-e.priority)[0];if(n&&o!==void 0)t.startupAnnouncementPick=o;return o}function lJr(){let n=u().filter(s).sort((t,r)=>r.priority-t.priority)[0];if(n===void 0)return!1;return JSON.stringify({id:n.id,title:n.title,text:n.text,footer:n.footer})}
export{qje,lJr};
