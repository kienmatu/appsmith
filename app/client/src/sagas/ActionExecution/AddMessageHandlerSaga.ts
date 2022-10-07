import { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import { AddMessageHandlerDescription } from "entities/DataTree/actionTriggers";
import { Channel, channel } from "redux-saga";
import { call, take, spawn } from "redux-saga/effects";
import { executeAppAction, TriggerMeta } from "./ActionExecutionSagas";

interface MessageChannelPayload {
  callbackString: string;
  callbackData: unknown;
  eventType: EventType;
  triggerMeta: TriggerMeta;
}

export function* addMessageHandlerSaga(
  actionPayload: AddMessageHandlerDescription["payload"],
  eventType: EventType,
  triggerMeta: TriggerMeta,
) {
  const messageChannel = channel<MessageChannelPayload>();
  yield spawn(messageChannelHandler, messageChannel);

  const messageHandler = (event: MessageEvent) => {
    if (event.currentTarget !== window) return;
    if (event.type !== "message") return;
    if (event.origin !== actionPayload.acceptedOrigin) return;

    messageChannel.put({
      callbackString: actionPayload.callbackString,
      callbackData: event.data,
      eventType,
      triggerMeta,
    });
  };

  window.addEventListener("message", messageHandler);
}

function* messageChannelHandler(channel: Channel<MessageChannelPayload>) {
  try {
    while (true) {
      const payload: MessageChannelPayload = yield take(channel);
      const { callbackData, callbackString, eventType, triggerMeta } = payload;
      yield call(executeAppAction, {
        dynamicString: callbackString,
        callbackData: [callbackData],
        event: { type: eventType },
        triggerPropertyName: triggerMeta.triggerPropertyName,
        source: triggerMeta.source,
      });
    }
  } finally {
    channel.close();
  }
}
