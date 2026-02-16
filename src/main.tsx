import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Patch customElements.define to prevent "already defined" errors from third-party scripts
const originalDefine = customElements.define;
customElements.define = function (name, constructor, options) {
    if (!customElements.get(name)) {
        originalDefine.call(customElements, name, constructor, options);
    } else {
        console.warn(`Ignoring duplicate custom element definition: ${name}`);
    }
};

createRoot(document.getElementById("root")!).render(<App />);
