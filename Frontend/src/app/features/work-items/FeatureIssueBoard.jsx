import React,{useId,useState} from 'react';
import {ticketColumns,ticketTransitionLabel} from './ticketWorkflow';

export function FeatureIssueBoard({items,columns=[],selectedColumn='',onColumn,onOpen,onMove}) {
 const hintId=useId(),[dragged,setDragged]=useState(null),[dropTarget,setDropTarget]=useState(null);
 const draggingItem=items.find(item=>item.id===dragged);
 function finishDrag(){setDragged(null);setDropTarget(null);}
 return <div className="feature-kanban"><p id={hintId} className="feature-kanban-hint">Số lượng là tổng theo bộ lọc trên máy chủ. Chọn cột để tải và phân trang riêng. Cuộn ngang để xem chín cột. Kéo thả hoặc chọn trạng thái mở bước xác nhận.</p>
  <div className="feature-kanban-scroll" role="region" aria-label="Bảng trạng thái Bug và QA" aria-describedby={hintId} tabIndex={0} data-lenis-prevent><div className="feature-kanban-columns">
   {ticketColumns.map(column=>{
    const cards=items.filter(item=>item.boardColumn===column.id),count=columns.find(value=>value.id===column.id)?.count;
    const allowedDrop=dropTarget===column.id&&draggingItem?.allowedTransitions?.some(value=>value.columnId===column.id);
    return <section key={column.id} aria-label={`Cột ${column.label}`} className={`feature-kanban-column${allowedDrop?' is-drop-target':''}${selectedColumn===column.id?' is-selected':''}`} onDragOver={event=>{event.preventDefault();setDropTarget(column.id);}} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget))setDropTarget(null);}} onDrop={event=>{event.preventDefault();const id=event.dataTransfer.getData('text/plain');finishDrag();onMove(items.find(item=>String(item.id)===id),column.id);}}>
     <header className="feature-kanban-column-header"><span className="feature-kanban-status-dot" style={{backgroundColor:column.color}} aria-hidden="true"/><h2>{column.label}</h2><span className="feature-kanban-count" aria-label={`${count??'Chưa tải tổng'} Issue theo bộ lọc`}>{count??'—'}</span></header>
     <button className="cat-btn ticket-column-select" aria-pressed={selectedColumn===column.id} onClick={()=>onColumn?.(column.id)}>Xem cột {column.label}</button>
     {column.id==='processed'&&<p className="wi-note ticket-column-note">Chờ tester xác nhận · Chưa hoàn tất</p>}
     <div className="feature-kanban-cards">{cards.length===0&&<p className="feature-kanban-empty">{count===0?'Chưa có Issue':count>0?'Chưa có thẻ trong trang đang tải. Chọn cột để xem.':'Chưa tải tổng từ máy chủ.'}</p>}
      {cards.map(item=><article key={item.id} className={`feature-kanban-card${dragged===item.id?' is-dragging':''}`} draggable={!!item.allowedTransitions?.length} onDragStart={event=>{event.dataTransfer.setData('text/plain',String(item.id));event.dataTransfer.effectAllowed='move';setDragged(item.id);}} onDragEnd={finishDrag}><div className="feature-kanban-card-meta"><span className="feature-kanban-type">{item.type}</span><button className="feature-kanban-key" onClick={()=>onOpen(item.id)}>{item.key}</button></div><button className="feature-kanban-title" onClick={()=>onOpen(item.id)}>{item.title}</button>{item.featureName&&<p className="feature-kanban-feature">{item.featureName}</p>}<p className="feature-kanban-assignee">{item.assignee||'Chưa phân công'}</p>{item.allowedTransitions?.length>0&&<select aria-label={'Chuyển trạng thái '+item.key} value="" onChange={event=>onMove(item,event.target.value)}><option value="">Chuyển trạng thái…</option>{item.allowedTransitions.map(value=><option key={value.columnId} value={value.columnId}>{ticketTransitionLabel(value)}</option>)}</select>}</article>)}
     </div>
    </section>;
   })}
  </div></div>
 </div>;
}
