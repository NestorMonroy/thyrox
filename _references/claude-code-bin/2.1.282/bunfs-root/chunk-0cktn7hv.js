// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Kr,fC,le}from"/$bunfs/root/chunk-wbbthbh9.js";import{f}from"/$bunfs/root/chunk-f344jh32.js";import{pH}from"/$bunfs/root/chunk-ga02wneq.js";import{de,un,co,Kn,lt}from"/$bunfs/root/chunk-9mj2syww.js";var c=f(()=>Kn(lt({id:de(),title:de().optional(),text:de(),footer:de().optional(),priority:un().default(0),maxImpressions:un().default(3),accentBar:co().default(!0),requiresModel:de().optional()})).default([])),i=[];function u(){let n=fC("tengu_startup_announcements",i),t=c().safeParse(n);return t.success?t.data:i}function s(n){return n.requiresModel===void 0||Kr(n.requiresModel)}function TUe(n){let t=pH();if(t.startupAnnouncementPick!==void 0)return t.startupAnnouncementPick;let r=le().announcementImpressions??{},o=u().filter((e)=>(r[e.id]??0)<e.maxImpressions&&s(e)).sort((e,a)=>a.priority-e.priority)[0];if(n&&o!==void 0)t.startupAnnouncementPick=o;return o}function nVr(){let n=u().filter(s).sort((t,r)=>r.priority-t.priority)[0];if(n===void 0)return!1;return JSON.stringify({id:n.id,title:n.title,text:n.text,footer:n.footer})}
export{TUe,nVr};
