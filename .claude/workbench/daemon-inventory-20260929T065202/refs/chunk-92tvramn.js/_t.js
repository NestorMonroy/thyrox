==== _t: 1 definicion(es) de nivel superior
---- chunk-92tvramn.js function _t [17264,17765)
function _t(r){let e,o=!0;try{e=J(r)}catch{e=void 0,o=!1}let n;try{n=Nen().safeParse(e)}catch{return m("daemon_bg_dispatch_ingest","transform_throw"),{ok:!1,reason:y("transform_throw")}}if(!n.success)return m("daemon_bg_dispatch_ingest",o?"schema":"bad_json"),{ok:!1,reason:y("schema")};if(Date.now()-n.data.createdAt>Jt)return m("daemon_bg_dispatch_ingest","stale"),{ok:!1,reason:y("stale")};let{env:a,reattachEnv:h}=n.data;return{ok:!0,dispatch:{...n.data,env:BPe(a,ror),reattachEnv:h&&BPe(h,Q7e)}}}
