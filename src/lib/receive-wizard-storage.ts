export const ACTIVE_RECEIVE_REQUEST_KEY = "receiveWizard:activeRequestId";

export function receiveFormKey(requestId: string) {
  return `receiveItemsForm:${requestId}`;
}

export function receiveSlipFileKey(requestId: string) {
  return `receiveItemsSlipFile:${requestId}`;
}

export function receiveFlagKey(requestId: string) {
  return `receiveItemsReceiving:${requestId}`;
}

export function receiveStepKey(requestId: string) {
  return `receiveItemsStep:${requestId}`;
}
