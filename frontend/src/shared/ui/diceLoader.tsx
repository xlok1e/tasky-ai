import {DotLottiePlayer} from "@dotlottie/react-player";
import "@dotlottie/react-player/dist/index.css";

function DiceLoader({className, ...props}: React.ComponentProps<"div">) {
  return (
    <div className={className} {...props}>
      <DotLottiePlayer src="/images/dice.lottie" autoplay loop/>
    </div>
  );
}

export {DiceLoader};
