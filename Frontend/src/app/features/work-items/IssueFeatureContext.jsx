import React from 'react';
import './feature-issues.css';

export function IssueFeatureContext({featureId,featureName,featureEnvironment,featureDescription}) {
 return <section className="feature-issue-context" aria-label="Thông tin Feature hiện tại">
  <h4>Thông tin Feature hiện tại</h4>
  <dl>
   <div><dt>Tên Feature</dt><dd>{featureName?.trim()||`Feature #${featureId}`}</dd></div>
   <div><dt>Môi trường / server</dt><dd>{featureEnvironment?.trim()||'Chưa ghi môi trường / server'}</dd></div>
   <div className="feature-issue-context-description"><dt>Mô tả Feature</dt><dd>{featureDescription?.trim()||'Chưa có mô tả Feature'}</dd></div>
  </dl>
 </section>;
}
