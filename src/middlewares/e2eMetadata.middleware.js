export function e2eMetadata(req, _res, next) {
  const testRunId = req.get('x-e2e-test-run-id');
  const correlationId = req.get('x-e2e-correlation-id');
  const flowId = req.get('x-e2e-flow-id');

  if (testRunId || correlationId || flowId) {
    req.e2eMetadata = {
      testRunId,
      correlationId,
      flowId
    };
  }

  next();
}
