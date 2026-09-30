==== NRe: 1 definicion(es) de nivel superior
---- chunk-0jw7026c.js variable NRe [25800,26296)
NRe=XC(async()=>{let e=re(),n=a.NODE_EXTRA_CA_CERTS;if(!n){if(e.extraCACerts!==null)return e.extraCACerts=null,ne(e),!0;return!1}try{let r=await ce().readFile(n,{encoding:"utf8"});if(e.extraCACerts?.path===n&&e.extraCACerts.content===r)return!1;e.extraCACerts={path:n,content:r}}catch(r){if(t(`CA certs: Failed to read NODE_EXTRA_CA_CERTS file (${n}): ${r}`,{level:"error"}),F("read_failed"))m("ca_certs_load","read_failed");if(e.extraCACerts===null)return!1;e.extraCACerts=null}return ne(e),!0})
