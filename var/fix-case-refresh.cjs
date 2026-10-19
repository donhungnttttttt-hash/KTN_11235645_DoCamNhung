const fs=require('fs');const path='Frontend/src/app/features/file-work/FileWorkDetail.jsx';let s=fs.readFileSync(path,'utf8');
function swap(a,b){if(!s.includes(a))throw Error('Missing replacement '+a.slice(0,80));s=s.replace(a,b);}
swap("useEffect, useRef, useState", "useEffect, useLayoutEffect, useRef, useState");
swap("import './file-work.css';", "import './file-work.css';\nimport { useRefreshingResource } from '../../hooks/useRefreshingResource';");
swap('noticeRef=useRef(null)', 'caseButtons=useRef(new Map()),savedFocus=useRef(null)');
swap('JSON.stringify([project.id,groupId,selectedBuild,reload])', 'JSON.stringify([project.id,groupId,selectedBuild])');
swap('const resource=useResource(async options=>({scope:readScope,detail:await fileWorkApi.detail(project.id,groupId,options)}),[project.id,groupId,selectedBuild,reload]);', 'const resource=useRefreshingResource(async options=>({scope:readScope,detail:await fileWorkApi.detail(project.id,groupId,options)}),readScope,reload);');
swap('const projection=useResource(async options=>({scope:readScope,view:await fileWorkApi.execution(project.id,groupId,selectedBuild?Number(selectedBuild):undefined,options)}),[project.id,groupId,selectedBuild,reload]);', 'const projection=useRefreshingResource(async options=>({scope:readScope,view:await fileWorkApi.execution(project.id,groupId,selectedBuild?Number(selectedBuild):undefined,options)}),readScope,reload);');
swap('const caps=g?.capabilities || {},scaps=session?.capabilities || {};', 'const stale=resource.loading || projection.loading || !!resource.error || !!projection.error;\n  const caps=stale?{}:g?.capabilities || {},scaps=stale?{}:session?.capabilities || {};');
swap('!resource.loading && v?.group.capabilities', '!stale && v?.group.capabilities');
swap("useEffect(()=>{if(notice)noticeRef.current?.focus();},[notice]);", "useLayoutEffect(()=>{if(savedFocus.current && !stale && !busy){caseButtons.current.get(savedFocus.current)?.focus({preventScroll:true});savedFocus.current=null;}},[stale,busy,v]);");
swap('key={code} className={`fw-result-${code}`}', 'key={code} ref={node=>{const key=`${r.runItemId}/${code}`;if(node)caseButtons.current.set(key,node);else caseButtons.current.delete(key);}} className={`fw-result-${code}`}');
swap('<p tabIndex={-1} ref={noticeRef} role="status">', '<p role="status">');
swap('{data && <fieldset disabled={busy}>', '{data && <fieldset disabled={busy || stale} aria-busy={resource.loading || projection.loading}>');
swap("onSaved={()=>{setAttempt(null);setNotice('Đã lưu kết quả; đang cập nhật bảng.');refresh(x=>x+1);}}", "onSaved={()=>{savedFocus.current=`${attempt.row.runItemId}/${attempt.result}`;setAttempt(null);setAttemptBusy(false);setNotice('Đã lưu kết quả; đang cập nhật bảng.');refresh(x=>x+1);}}");
swap('focus.current?.focus();return()=>{live.current=false;previous.current?.focus();};', "if(selected.result!=='OK')focus.current?.focus();return()=>{live.current=false;previous.current?.focus({preventScroll:true});};");
fs.writeFileSync(path,s);
const inbox='Frontend/src/app/features/file-work/ActionInbox.jsx';s=fs.readFileSync(inbox,'utf8');s=s.replace('<ul className="fw-inbox-list">','<ul className="fw-inbox-list" aria-busy={data.loading}>');fs.writeFileSync(inbox,s);
