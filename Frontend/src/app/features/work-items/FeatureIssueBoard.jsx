import React, {useId, useState} from 'react';
import {statuses} from './data';

export function FeatureIssueBoard({items, onOpen, onMove}) {
  const hintId = useId();
  const [dragged, setDragged] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const draggingItem = items.find(item => item.id === dragged);

  function finishDrag() {
    setDragged(null);
    setDropTarget(null);
  }

  return <div className="feature-kanban">
    <p id={hintId} className="feature-kanban-hint">
      Số lượng trong từng cột thuộc trang đang xem. Cuộn ngang để xem các trạng thái.
      {' '}Mở thẻ hoặc chọn trạng thái để xử lý; kéo thả luôn mở bước xác nhận.
    </p>
    <div className="feature-kanban-scroll" role="region" aria-label="Bảng trạng thái Bug và QA"
      aria-describedby={hintId} tabIndex={0} data-lenis-prevent>
      <div className="feature-kanban-columns">
        {statuses.map(status => {
          const cards = items.filter(item => item.status === status.id);
          const allowedDrop = dropTarget === status.id && draggingItem?.canTransition
            && draggingItem.allowedStatuses?.some(value => value.id === status.id);
          return <section key={status.id} aria-label={`Cột ${status.label}`}
            className={`feature-kanban-column${allowedDrop ? ' is-drop-target' : ''}`}
            onDragOver={event => {event.preventDefault();setDropTarget(status.id);}}
            onDragLeave={event => {if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget(null);}}
            onDrop={event => {
              event.preventDefault();
              const id = event.dataTransfer.getData('text/plain');
              finishDrag();
              onMove(items.find(item => String(item.id) === id), status.id);
            }}>
            <header className="feature-kanban-column-header">
              <span className="feature-kanban-status-dot" style={{backgroundColor:status.color}} aria-hidden="true"/>
              <h2>{status.label}</h2>
              <span className="feature-kanban-count" aria-label={`${cards.length} Issue trong trang này`}>{cards.length}</span>
            </header>
            <div className="feature-kanban-cards">
              {cards.length === 0 && <p className="feature-kanban-empty">Chưa có Issue</p>}
              {cards.map(item => <article key={item.id}
                className={`feature-kanban-card${dragged === item.id ? ' is-dragging' : ''}`}
                draggable={item.canTransition}
                onDragStart={event => {
                  event.dataTransfer.setData('text/plain', String(item.id));
                  event.dataTransfer.effectAllowed = 'move';
                  setDragged(item.id);
                }} onDragEnd={finishDrag}>
                <div className="feature-kanban-card-meta">
                  <span className="feature-kanban-type">{item.type}</span>
                  <button type="button" className="feature-kanban-key" onClick={() => onOpen(item.id)}>{item.key}</button>
                </div>
                <button type="button" className="feature-kanban-title" onClick={() => onOpen(item.id)}>{item.title}</button>
                {item.featureName && <p className="feature-kanban-feature">{item.featureName}</p>}
                <p className="feature-kanban-assignee">{item.assignee || 'Chưa phân công'}</p>
                {item.canTransition && <select aria-label={'Chuyển trạng thái ' + item.key} value=""
                  onChange={event => onMove(item, event.target.value)}>
                  <option value="">Chuyển trạng thái…</option>
                  {item.allowedStatuses?.filter(value => value.id !== item.status).map(value =>
                    <option key={value.id} value={value.id}>{value.label}</option>)}
                </select>}
              </article>)}
            </div>
          </section>;
        })}
      </div>
    </div>
  </div>;
}
