import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildTextLkSendRequest } from "./textlk";

describe("buildTextLkSendRequest", () => {
  it("uses the exact field names required by Text.lk v3", () => {
    assert.deepEqual(
      buildTextLkSendRequest({
        recipient: "94712345678",
        senderId: "LankaLearn",
        message: "Registration complete",
      }),
      {
        recipient: "94712345678",
        sender_id: "LankaLearn",
        type: "plain",
        message: "Registration complete",
      }
    );
  });
});
