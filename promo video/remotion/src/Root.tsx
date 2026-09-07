import "./index.css";
import {MotionProof} from "./MotionCut";
import {RealShowcase2026} from "./RealShowcase2026";
import {Showcase2026} from "./Showcase2026";
import { Composition } from "remotion";
import { MathPasterPromo, totalFrames } from "./MathPasterPromo";
import { FPS } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Composition id="MotionProof" component={MotionProof} durationInFrames={3600} fps={60} width={1920} height={1080}/>
    <Composition id="RealShowcase2026" component={RealShowcase2026} durationInFrames={1500} fps={25} width={1920} height={1080}/>
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
