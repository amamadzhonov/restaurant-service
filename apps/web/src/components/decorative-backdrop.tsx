import type { CSSProperties } from "react";

export type DecorativeBackdropPreset = "home" | "public_menu" | "public_ordering" | "public_status";

type BackdropLayer = {
  asset: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  width: string;
  height?: string;
  opacity: string;
  blur: string;
  rotate?: string;
  scale?: string;
  duration?: string;
  delay?: string;
  fit?: "contain" | "cover";
  motion?: "float" | "reverse" | "breath";
  mobileHidden?: boolean;
};

type BackdropStyle = CSSProperties & Record<`--${string}`, string>;

const PRESETS: Record<DecorativeBackdropPreset, BackdropLayer[]> = {
  home: [
    {
      asset: "/food/table-spread.svg",
      top: "-7rem",
      left: "-8rem",
      width: "34rem",
      opacity: "0.16",
      blur: "6px",
      rotate: "-12deg",
      scale: "1.12",
      duration: "28s",
      motion: "breath",
      fit: "contain",
    },
    {
      asset: "/food/citrus-spritz.svg",
      top: "3rem",
      right: "-1.5rem",
      width: "15rem",
      opacity: "0.34",
      blur: "1px",
      rotate: "9deg",
      scale: "1",
      duration: "20s",
      delay: "1s",
      motion: "float",
      fit: "contain",
    },
    {
      asset: "/food/rigatoni-bowl.svg",
      bottom: "-4rem",
      left: "26%",
      width: "19rem",
      opacity: "0.16",
      blur: "5px",
      rotate: "6deg",
      scale: "1.02",
      duration: "26s",
      motion: "reverse",
      mobileHidden: true,
      fit: "contain",
    },
    {
      asset: "/food/cheesecake-slice.svg",
      bottom: "1.5rem",
      right: "20%",
      width: "13rem",
      opacity: "0.18",
      blur: "2px",
      rotate: "-14deg",
      scale: "0.98",
      duration: "24s",
      delay: "2s",
      motion: "float",
      fit: "contain",
    },
  ],
  public_menu: [
    {
      asset: "/food/flatbread-board.svg",
      top: "-2rem",
      right: "-5rem",
      width: "28rem",
      opacity: "0.12",
      blur: "7px",
      rotate: "8deg",
      scale: "1.08",
      duration: "28s",
      motion: "breath",
      fit: "contain",
    },
    {
      asset: "/food/citrus-spritz.svg",
      top: "8rem",
      left: "-2rem",
      width: "12rem",
      opacity: "0.2",
      blur: "1px",
      rotate: "-10deg",
      scale: "1",
      duration: "19s",
      motion: "float",
      mobileHidden: true,
      fit: "contain",
    },
    {
      asset: "/food/table-spread.svg",
      bottom: "8rem",
      left: "-9rem",
      width: "31rem",
      opacity: "0.11",
      blur: "8px",
      rotate: "-16deg",
      scale: "1.08",
      duration: "30s",
      motion: "reverse",
      fit: "contain",
    },
  ],
  public_ordering: [
    {
      asset: "/food/salmon-plate.svg",
      top: "-1rem",
      left: "-5rem",
      width: "27rem",
      opacity: "0.13",
      blur: "8px",
      rotate: "-10deg",
      scale: "1.08",
      duration: "30s",
      motion: "breath",
      fit: "contain",
    },
    {
      asset: "/food/citrus-spritz.svg",
      top: "20rem",
      right: "-1rem",
      width: "13rem",
      opacity: "0.18",
      blur: "1px",
      rotate: "10deg",
      scale: "1",
      duration: "21s",
      motion: "float",
      fit: "contain",
    },
    {
      asset: "/food/cheesecake-slice.svg",
      bottom: "5rem",
      left: "12%",
      width: "11rem",
      opacity: "0.12",
      blur: "2px",
      rotate: "-10deg",
      scale: "1",
      duration: "23s",
      delay: "1.5s",
      motion: "reverse",
      mobileHidden: true,
      fit: "contain",
    },
  ],
  public_status: [
    {
      asset: "/food/table-spread.svg",
      top: "-6rem",
      right: "-7rem",
      width: "30rem",
      opacity: "0.1",
      blur: "9px",
      rotate: "14deg",
      scale: "1.12",
      duration: "32s",
      motion: "breath",
      fit: "contain",
    },
    {
      asset: "/food/cheesecake-slice.svg",
      bottom: "4rem",
      left: "-1rem",
      width: "13rem",
      opacity: "0.18",
      blur: "1px",
      rotate: "-12deg",
      scale: "1",
      duration: "20s",
      motion: "float",
      fit: "contain",
    },
    {
      asset: "/food/citrus-spritz.svg",
      top: "7rem",
      left: "4%",
      width: "10rem",
      opacity: "0.12",
      blur: "1px",
      rotate: "-6deg",
      scale: "0.96",
      duration: "19s",
      motion: "reverse",
      mobileHidden: true,
      fit: "contain",
    },
  ],
};

function toLayerStyle(layer: BackdropLayer): BackdropStyle {
  return {
    "--backdrop-image": `url(${layer.asset})`,
    "--backdrop-top": layer.top ?? "auto",
    "--backdrop-right": layer.right ?? "auto",
    "--backdrop-bottom": layer.bottom ?? "auto",
    "--backdrop-left": layer.left ?? "auto",
    "--backdrop-width": layer.width,
    "--backdrop-height": layer.height ?? layer.width,
    "--backdrop-opacity": layer.opacity,
    "--backdrop-blur": layer.blur,
    "--backdrop-rotate": layer.rotate ?? "0deg",
    "--backdrop-scale": layer.scale ?? "1",
    "--backdrop-duration": layer.duration ?? "22s",
    "--backdrop-delay": layer.delay ?? "0s",
  };
}

export function DecorativeBackdrop({ preset }: { preset: DecorativeBackdropPreset }) {
  const layers = PRESETS[preset];

  return (
    <div aria-hidden="true" className={`decorative-backdrop decorative-backdrop--${preset}`}>
      <div className="decorative-backdrop__veil" />
      {layers.map((layer, index) => (
        <div
          className={[
            "decorative-backdrop__layer",
            layer.fit === "cover" ? "decorative-backdrop__layer--cover" : "",
            layer.motion ? `decorative-backdrop__layer--${layer.motion}` : "",
            layer.mobileHidden ? "decorative-backdrop__layer--mobile-hidden" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          key={`${preset}-${layer.asset}-${index}`}
          style={toLayerStyle(layer)}
        />
      ))}
    </div>
  );
}
