export type TextLkSendRequest = {
  recipient: string;
  sender_id: string;
  type: "plain";
  message: string;
};

/** Text.lk v3 accepts the send payload as JSON. */
export function buildTextLkSendRequest(input: {
  recipient: string;
  senderId: string;
  message: string;
}): TextLkSendRequest {
  return {
    recipient: input.recipient,
    sender_id: input.senderId,
    type: "plain",
    message: input.message,
  };
}
