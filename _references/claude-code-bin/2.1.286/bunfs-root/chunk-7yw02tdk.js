// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Hr,IR,ce}from"/$bunfs/root/chunk-4hjp8tw4.js";import{p}from"/$bunfs/root/chunk-159k5j1y.js";import{Rx}from"/$bunfs/root/chunk-q6jg9kg6.js";import{de,ln,po,Yn,ut}from"/$bunfs/root/chunk-7xe75c5f.js";var c=p(()=>Yn(ut({id:de(),title:de().optional(),text:de(),footer:de().optional(),priority:ln().default(0),maxImpressions:ln().default(3),accentBar:po().default(!0),requiresModel:de().optional()})).default([])),i=[];function u(){let n=IR("tengu_startup_announcements",i),t=c().safeParse(n);return t.success?t.data:i}function s(n){return n.requiresModel===void 0||Hr(n.requiresModel)}function fze(n){let t=Rx();if(t.startupAnnouncementPick!==void 0)return t.startupAnnouncementPick;let r=ce().announcementImpressions??{},o=u().filter((e)=>(r[e.id]??0)<e.maxImpressions&&s(e)).sort((e,a)=>a.priority-e.priority)[0];if(n&&o!==void 0)t.startupAnnouncementPick=o;return o}function qeo(){let n=u().filter(s).sort((t,r)=>r.priority-t.priority)[0];if(n===void 0)return!1;return JSON.stringify({id:n.id,title:n.title,text:n.text,footer:n.footer})}
export{fze,qeo};
