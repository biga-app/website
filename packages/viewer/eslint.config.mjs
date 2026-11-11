import { config } from "@biga/eslint-config/react-internal";

export default [...config, { rules: {
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/refs": "off",
    "react-hooks/incompatible-library": "off",
} }];
