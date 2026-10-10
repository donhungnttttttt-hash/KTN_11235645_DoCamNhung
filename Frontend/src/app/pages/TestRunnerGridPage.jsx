import React from 'react';
import { ExecutionRunnerPage } from '../features/test-execution/ExecutionRunnerPage';

// Route adapter: execution now comes from the server, never from prototype fixtures.
export function TestRunnerGridPage({ specId, navigate }) {
  return <ExecutionRunnerPage cycleId={specId} navigate={navigate} />;
}
