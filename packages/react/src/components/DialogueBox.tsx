/**
 * DialogueBox - Displays current dialogue node
 */

import React from "react";
import type { SnapshotDialogue } from "@doodle-engine/core";

export interface DialogueBoxProps {
  dialogue: SnapshotDialogue;
  className?: string;
}

export function DialogueBox({ dialogue, className = "" }: DialogueBoxProps) {
  return (
    <div className={`dialogue-box ${className}`}>
      {dialogue.portrait && (
        <div className="dialogue-portrait">
          <img src={dialogue.portrait} alt={dialogue.speakerName} />
        </div>
      )}

      <div className="dialogue-content">
        <div className="dialogue-speaker">{dialogue.speakerName}</div>
        <div className="dialogue-text">{dialogue.text}</div>
      </div>
    </div>
  );
}
