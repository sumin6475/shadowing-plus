// icon.tsx — the prototype's 24×24 stroke icon set (sp-theme.jsx `I`), ported
// to react-native-svg. Same names, same geometry.
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

export type IconName =
  | "sun"
  | "mic"
  | "bank"
  | "map"
  | "book"
  | "search"
  | "plus"
  | "play"
  | "pause"
  | "chev"
  | "back"
  | "speaker"
  | "check"
  | "x"
  | "dots"
  | "bell"
  | "gear"
  | "ear"
  | "pen"
  | "arrow"
  | "sparkle"
  | "upload"
  | "text"
  | "clip"
  | "wave2";

interface IconProps {
  name: IconName;
  s?: number;
  c?: string;
  w?: number;
}

export function Icon({ name, s = 20, c = "currentColor", w = 1.8 }: IconProps) {
  const common = {
    fill: "none",
    stroke: c,
    strokeWidth: w,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  let body: React.ReactNode = null;
  switch (name) {
    case "sun":
      body = (
        <G {...common}>
          <Circle cx="12" cy="12" r="4.4" />
          <Path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.2 5.2l1.9 1.9M16.9 16.9l1.9 1.9M18.8 5.2l-1.9 1.9M7.1 16.9l-1.9 1.9" />
        </G>
      );
      break;
    case "mic":
      body = (
        <G {...common}>
          <Rect x="9" y="3" width="6" height="11" rx="3" />
          <Path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5" />
        </G>
      );
      break;
    case "bank":
      body = <Path {...common} d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4-6.5 4v-16a1 1 0 0 1 1-1z" />;
      break;
    case "map":
      body = (
        <G {...common}>
          <Circle cx="7.5" cy="8" r="3.6" />
          <Circle cx="16.5" cy="14.5" r="4.6" />
          <Circle cx="15" cy="5" r="1.7" />
        </G>
      );
      break;
    case "book":
      body = (
        <G {...common}>
          <Path d="M4.5 4.5h6a2 2 0 0 1 2 2v13a2.5 2.5 0 0 0-2.5-2.5h-5.5z" />
          <Path d="M19.5 4.5h-6a1 1 0 0 0-1 1v14a2.5 2.5 0 0 1 2.5-2.5h4.5z" />
        </G>
      );
      break;
    case "search":
      body = (
        <G {...common}>
          <Circle cx="10.5" cy="10.5" r="6.5" />
          <Path d="M15.5 15.5L21 21" />
        </G>
      );
      break;
    case "plus":
      body = <Path {...common} d="M12 5v14M5 12h14" />;
      break;
    case "play":
      body = <Path {...common} d="M8 5.5v13l10-6.5z" />;
      break;
    case "pause":
      body = <Path {...common} d="M8.5 5.5v13M15.5 5.5v13" />;
      break;
    case "chev":
      body = <Path {...common} d="M9 5l7 7-7 7" />;
      break;
    case "back":
      body = <Path {...common} d="M15 5l-7 7 7 7" />;
      break;
    case "speaker":
      body = (
        <G {...common}>
          <Path d="M4 9.5v5h3.5L13 19V5L7.5 9.5z" />
          <Path d="M16.5 9a4.5 4.5 0 0 1 0 6" />
        </G>
      );
      break;
    case "check":
      body = <Path {...common} d="M4.5 12.5l5 5L19.5 7" />;
      break;
    case "x":
      body = <Path {...common} d="M6 6l12 12M18 6L6 18" />;
      break;
    case "dots":
      body = (
        <G>
          <Circle cx="5" cy="12" r="1.6" fill={c} />
          <Circle cx="12" cy="12" r="1.6" fill={c} />
          <Circle cx="19" cy="12" r="1.6" fill={c} />
        </G>
      );
      break;
    case "bell":
      body = (
        <G {...common}>
          <Path d="M12 4a6 6 0 0 1 6 6v3.5l1.5 2.5H4.5L6 13.5V10a6 6 0 0 1 6-6z" />
          <Path d="M10 19a2 2 0 0 0 4 0" />
        </G>
      );
      break;
    case "gear":
      body = (
        <G {...common}>
          <Circle cx="12" cy="12" r="3.2" />
          <Path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        </G>
      );
      break;
    case "ear":
      body = (
        <G {...common}>
          <Path d="M8 19a4 4 0 0 1-2-3.5V9.5A6.5 6.5 0 0 1 18.5 9c0 3-2.5 4-3.5 6-.7 1.4-.8 3.5-3 3.5" />
          <Path d="M10.5 9.5a2.8 2.8 0 0 1 5 1" />
        </G>
      );
      break;
    case "pen":
      body = <Path {...common} d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z" />;
      break;
    case "arrow":
      body = <Path {...common} d="M5 12h14M13 6l6 6-6 6" />;
      break;
    case "sparkle":
      body = <Path {...common} d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z" />;
      break;
    case "upload":
      body = (
        <G {...common}>
          <Path d="M12 16V4M7 8.5L12 3.5l5 5" />
          <Path d="M4.5 15v4a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-4" />
        </G>
      );
      break;
    case "text":
      body = <Path {...common} d="M5 6h14M5 12h14M5 18h9" />;
      break;
    case "clip":
      body = (
        <G {...common}>
          <Rect x="4" y="5" width="16" height="14" rx="3" />
          <Path d="M10 9.5l4.5 2.5L10 14.5z" fill={c} stroke="none" />
        </G>
      );
      break;
    case "wave2":
      body = <Path {...common} d="M3 12h2.5M8 8v8M12 5v14M16 8v8M20.5 12H23" />;
      break;
  }
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}
