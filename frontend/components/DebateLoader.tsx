import { RiRobot3Line } from "react-icons/ri";
import { BiMessageRoundedDots } from "react-icons/bi";

export default function DebateLoader() {
  return (
    <div className="debate mx-auto my-4">
      {/* Left Robot */}
      <div className="robot left">
        <RiRobot3Line />
      </div>

      {/* Left Thinking Bubble */}
      <div className="thinking-bubble left-thinking">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>

      {/* Message flying Left to Right */}
      <div className="message send-right">
        <BiMessageRoundedDots />
      </div>

      {/* Right Thinking Bubble */}
      <div className="thinking-bubble right-thinking">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>

      {/* Message flying Right to Left */}
      <div className="message send-left">
        <BiMessageRoundedDots />
      </div>

      {/* Right Robot */}
      <div className="robot right">
        <RiRobot3Line />
      </div>
    </div>
  );
}
