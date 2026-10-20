import React, {useId,useRef,useState} from 'react';

export const defaultFeatureFilters = {keyword:'',archived:false,createdFrom:'',createdTo:'',sort:'created-desc'};

export function FeatureListFilters({onApply,onReload,loading,busy}) {
  const [draft,setDraft]=useState(defaultFeatureFilters),[error,setError]=useState('');
  const fromRef=useRef(null),hintId=useId(),errorId=useId();
  const change=(name,value)=>{setDraft(current=>({...current,[name]:value}));setError('');};
  function apply(event){
    event.preventDefault();
    if(draft.createdFrom&&draft.createdTo&&draft.createdFrom>draft.createdTo){
      setError('Ngày bắt đầu không được sau ngày kết thúc.');fromRef.current?.focus();return;
    }
    setError('');onApply({...draft,keyword:draft.keyword.trim()});
  }
  function clear(){setDraft(defaultFeatureFilters);setError('');onApply({...defaultFeatureFilters});}
  return <form className="testing-feature-filters" aria-label="Bộ lọc Feature" onSubmit={apply}>
    <div className="testing-feature-filter-fields">
      <label className="testing-feature-keyword">Tìm Feature<input type="search" placeholder="Tên, môi trường hoặc mô tả" maxLength={200} value={draft.keyword} onChange={e=>change('keyword',e.target.value)}/></label>
      <label>Tạo từ ngày<input ref={fromRef} type="date" min="1000-01-01" max="9999-12-31" value={draft.createdFrom} aria-describedby={error?`${hintId} ${errorId}`:hintId} aria-invalid={error?true:undefined} onChange={e=>change('createdFrom',e.target.value)}/></label>
      <label>Đến hết ngày<input type="date" min="1000-01-01" max="9999-12-31" value={draft.createdTo} aria-describedby={hintId} onChange={e=>change('createdTo',e.target.value)}/></label>
      <label>Sắp xếp<select value={draft.sort} onChange={e=>change('sort',e.target.value)}><option value="created-desc">Ngày tạo mới nhất</option><option value="created-asc">Ngày tạo cũ nhất</option><option value="name-asc">Tên A–Z</option></select></label>
    </div>
    <div className="testing-feature-filter-footer">
      <div><label className="testing-checkbox"><input type="checkbox" checked={draft.archived} onChange={e=>change('archived',e.target.checked)}/> Đã lưu trữ</label><p id={hintId} className="td-muted">Ngày tạo theo giờ Việt Nam (UTC+7), gồm cả ngày kết thúc.</p><p className="td-muted">Bấm Áp dụng để cập nhật kết quả sau khi đổi bộ lọc.</p></div>
      <div className="td-actions"><button type="submit" className="cat-btn cat-btn-mint" disabled={loading||busy}>Áp dụng</button><button type="button" className="cat-btn" disabled={loading||busy} onClick={clear}>Xóa bộ lọc</button><button type="button" className="cat-btn" disabled={loading||busy} onClick={onReload}>Làm mới</button></div>
    </div>
    {error&&<p id={errorId} className="td-error" role="alert">{error}</p>}
  </form>;
}
