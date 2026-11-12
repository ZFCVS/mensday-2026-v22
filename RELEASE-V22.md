# V22 — Labelled email hyperlinks

The popup provides a formatted email copy action and selectable preview containing View your card and Create another card as actual HTML anchors. The destinations are unchanged; this is labelled-link formatting, not a URL-shortening service. HTML text/attributes are escaped and destinations validated. Clipboard includes HTML and plain-text alternatives.

Flow: copy formatted email, open email with PNG/GIF files, then paste the message into the draft body. Keep source formatting if prompted. The native share payload no longer includes raw long URLs; links appear only after the formatted message is pasted. Clipboard copy does not attach files; file sharing does not itself carry HTML. Plain-text email mode may show the underlying URLs. No Teams option is present.

File sharing, mail subject handling and rich paste are controlled by the receiving email client. Actual Outlook handling has not been verified in a ZF session. Prior cybersecurity findings remain outside this release scope.
