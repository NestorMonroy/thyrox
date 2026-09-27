// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{ka}from"/$bunfs/root/chunk-8w2y72gy.js";var bm={CURSOR_VISIBLE:25,ALT_SCREEN:47,ALT_SCREEN_CLEAR:1049,MOUSE_NORMAL:1000,MOUSE_BUTTON:1002,MOUSE_ANY:1003,MOUSE_SGR:1006,MOUSE_SGR_PIXELS:1016,FOCUS_EVENTS:1004,BRACKETED_PASTE:2004,THEME_NOTIFY:2031,SYNCHRONIZED_UPDATE:2026,WIN32_INPUT_MODE:9001};function nD(E){return ka(`?${E}h`)}function Uj(E){return ka(`?${E}l`)}var k_t=nD(bm.SYNCHRONIZED_UPDATE),Aje=Uj(bm.SYNCHRONIZED_UPDATE),U8r=nD(bm.BRACKETED_PASTE),SVt=Uj(bm.BRACKETED_PASTE),wVt=nD(bm.FOCUS_EVENTS),JJe=Uj(bm.FOCUS_EVENTS),B8r=nD(bm.THEME_NOTIFY),vVt=Uj(bm.THEME_NOTIFY),mI=nD(bm.CURSOR_VISIBLE),gI=Uj(bm.CURSOR_VISIBLE),QJe=nD(bm.ALT_SCREEN_CLEAR),ZJe=Uj(bm.ALT_SCREEN_CLEAR),EVt=Uj(bm.WIN32_INPUT_MODE),S=nD(bm.MOUSE_NORMAL)+nD(bm.MOUSE_BUTTON)+nD(bm.MOUSE_ANY)+nD(bm.MOUSE_SGR),_=nD(bm.MOUSE_NORMAL)+nD(bm.MOUSE_SGR),soe=Uj(bm.MOUSE_SGR)+Uj(bm.MOUSE_ANY)+Uj(bm.MOUSE_BUTTON)+Uj(bm.MOUSE_NORMAL),j8r=nD(bm.MOUSE_SGR_PIXELS),W8r=Uj(bm.MOUSE_SGR_PIXELS)+nD(bm.MOUSE_SGR);function kVt(E){switch(E){case"full":return S;case"scroll":return _;case"off":return""}}
export{bm,nD,Uj,k_t,Aje,U8r,SVt,wVt,JJe,B8r,vVt,mI,gI,QJe,ZJe,EVt,soe,j8r,W8r,kVt};
