import "./index.css";
import { Composition } from "remotion";
import { MathPasterPromo, totalFrames } from "./MathPasterPromo";
import { FPS } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Promo"
      component={MathPasterPromo}
      durationInFrames={totalFrames}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
