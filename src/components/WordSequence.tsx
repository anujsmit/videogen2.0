import { Sequence, useVideoConfig } from "remotion";

interface TimelineItem {
  text: string;
  start: number;
  end: number;
}

interface WordSequenceProps {
  timeline: TimelineItem[];
}

export const WordSequence: React.FC<WordSequenceProps> = ({ timeline }) => {
  const { fps } = useVideoConfig();

  if (!timeline || timeline.length === 0) {
    return null;
  }

  return (
    <>
      {timeline.map((item, index) => {
        const from = Math.floor(item.start * fps);
        const duration = Math.floor((item.end - item.start) * fps);

        if (!Number.isFinite(from) || duration <= 0) return null;

        return (
          <Sequence key={`${index}-${item.text}`} from={from} durationInFrames={duration}>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                height: "100%",
                padding: 40,
              }}
            >
              <h1
                style={{
                  color: "white",
                  fontSize: 90,
                  fontWeight: 700,
                  textAlign: "center",
                  textShadow: "0 0 20px rgba(255,255,255,0.5)",
                  lineHeight: 1.2,
                  maxWidth: "90%",
                  margin: 0,
                }}
              >
                {item.text}
              </h1>
            </div>
          </Sequence>
        );
      })}
    </>
  );
};

export default WordSequence;