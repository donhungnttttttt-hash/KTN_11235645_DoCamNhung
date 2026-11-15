import React from 'react';
import './feature-issues.css';

export function IssueFeatureContext({featureId,featureName,featureEnvironment,featureDescription}) {
 return <section className="feature-issue-context" aria-label="Thông tin Đợt kiểm thử hiện tại">
  <h4>Thông tin Đợt kiểm thử hiện tại</h4>
  <dl>
   <div><dt>Tên Đợt kiểm thử</dt><dd>{featureName?.trim()||`Đợt kiểm thử #${featureId}`}</dd></div>
   <div><dt>Môi trường / server</dt><dd>{featureEnvironment?.trim()||'Chưa ghi môi trường / server'}</dd></div>
   <div className="feature-issue-context-description"><dt>Mô tả Đợt kiểm thử</dt><dd>{featureDescription?.trim()||'Chưa có mô tả Đợt kiểm thử'}</dd></div>
  </dl>
 </section>;
}
