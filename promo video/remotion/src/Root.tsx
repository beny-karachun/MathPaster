import "./index.css";
import {Showcase2026} from "./Showcase2026";
import { Composition } from "remotion";
import { MathPasterPromo, totalFrames } from "./MathPasterPromo";
import { FPS } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Composition id="Showcase2026" component={Showcase2026} durationInFrames={1800} fps={30} width={1920} height={1080}/>
    <Composition
      id="Promo"
      component={MathPasterPromo}
      durationInFrames={totalFrames}
      fps={FPS}
      width={1920}
      height={1080}
    />
    </>
  );
};
