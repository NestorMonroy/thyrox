// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Vr,FC,le}from"/$bunfs/root/chunk-t6pwageh.js";import{f}from"/$bunfs/root/chunk-bnk68ax9.js";import{JO}from"/$bunfs/root/chunk-5t3x93y6.js";import{de,fn,ho,Xn,lt}from"/$bunfs/root/chunk-hn75r78z.js";var c=f(()=>Xn(lt({id:de(),title:de().optional(),text:de(),footer:de().optional(),priority:fn().default(0),maxImpressions:fn().default(3),accentBar:ho().default(!0),requiresModel:de().optional()})).default([])),i=[];function u(){let n=FC("tengu_startup_announcements",i),t=c().safeParse(n);return t.success?t.data:i}function s(n){return n.requiresModel===void 0||Vr(n.requiresModel)}function x1e(n){let t=JO();if(t.startupAnnouncementPick!==void 0)return t.startupAnnouncementPick;let r=le().announcementImpressions??{},o=u().filter((e)=>(r[e.id]??0)<e.maxImpressions&&s(e)).sort((e,a)=>a.priority-e.priority)[0];if(n&&o!==void 0)t.startupAnnouncementPick=o;return o}function z6r(){let n=u().filter(s).sort((t,r)=>r.priority-t.priority)[0];if(n===void 0)return!1;return JSON.stringify({id:n.id,title:n.title,text:n.text,footer:n.footer})}
export{x1e,z6r};
