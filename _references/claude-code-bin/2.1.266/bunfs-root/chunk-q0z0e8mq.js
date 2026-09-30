// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{ee}from"/$bunfs/root/chunk-jxxmkk37.js";import{NC,Kw,U0,Au,rn,lTn,fP,hp,B0,Rk,j0}from"/$bunfs/root/chunk-6ysaq0dt.js";import{xh,ly,jZe,ev,ue}from"/$bunfs/root/chunk-fmze7yw8.js";import{Cne,m3n}from"/$bunfs/root/chunk-k2bh8bs7.js";import{WH,i5,JE,Cdn,Rdn}from"/$bunfs/root/chunk-cfaeff50.js";function ydn(){return ee().frozenMultiFile??NC()}function u2(t){return Rk()&&ev(t)}function jX(t,e,o){if(Mde(t,e.slug))return!0;let n=Cdn&&ue(t).mode==="plan";if(Au()&&!n)return o||B0(rn(e.slug))&&Rdn(e)===!1||U0("foreign_read",e.slug);return jZe(t,e.slug,!o&&j0(e))}function Mde(t,e){let o=rn(e);return ue(t).mode!=="plan"&&B0(o)&&o?.lastProbeIssuedAt!==void 0&&!fP(o.lastProbeIssuedAt)&&m3n(e)}function Ave(t,e){let o=JE("read",t,e);return Mde(e,t.slug)?{ask:!1,foreignRead:!0,attested:!0}:Kw(o)}function Ode(t,e){let o=lTn(e);return o!==void 0&&hp(e)&&!WH(e)&&i5(e)&&ue(t).mode!=="plan"&&Cne(o)==="first_party_type"}function _dn(t,e){if(ly(t)||u2(t))return()=>"none";if(!xh(t))return()=>"save";let o=ue(t),n=o.mode==="auto",s=j0(e),r=o.shouldAvoidPermissionPrompts===!0;return(i)=>n&&!(s&&!i)?"save":r?"none":"ask"}
export{ydn,u2,jX,Mde,Ave,Ode,_dn};
